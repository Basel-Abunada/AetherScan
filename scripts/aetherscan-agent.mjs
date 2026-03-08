import { spawn } from "node:child_process"

const serverUrl = process.env.AETHERSCAN_SERVER_URL || "http://localhost:3000"
const agentToken = process.env.AETHERSCAN_AGENT_TOKEN
const once = process.env.AETHERSCAN_ONCE !== "false"

if (!agentToken) {
  console.error("Missing AETHERSCAN_AGENT_TOKEN")
  process.exit(1)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function runNmap(target, scanType) {
  const args = ["-oG", "-", "-sV", target]
  if (scanType === "quick") args.unshift("--top-ports", "100")
  if (scanType === "full") args.unshift("-p-")
  if (scanType === "vuln") args.unshift("--script", "vuln")

  return new Promise((resolve, reject) => {
    const child = spawn("nmap", args, { windowsHide: true })
    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk) => { stdout += chunk.toString() })
    child.stderr.on("data", (chunk) => { stderr += chunk.toString() })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr || `nmap exited with code ${code}`))

      const assets = stdout
        .split(/\r?\n/)
        .filter((line) => line.startsWith("Host:") && line.includes("Ports:"))
        .map((line) => {
          const hostMatch = line.match(/^Host:\s+([^\s]+)\s+\(([^)]*)\)/)
          const portsMatch = line.match(/Ports:\s+(.+)$/)
          const ipAddress = hostMatch?.[1] ?? "unknown"
          const hostname = hostMatch?.[2] || ipAddress
          const services = (portsMatch?.[1] ?? "")
            .split(",")
            .map((segment) => segment.trim())
            .filter(Boolean)
            .map((segment) => {
              const [portProto, state, , service] = segment.split("/")
              const [port] = portProto.split("/")
              return { port: Number(port), protocol: "tcp", name: service || "unknown", state: state || "open" }
            })
            .filter((service) => Number.isFinite(service.port) && service.state === "open")
          return { ipAddress, hostname, os: undefined, status: "up", services }
        })

      resolve(assets)
    })
  })
}

async function heartbeat() {
  await fetch(`${serverUrl}/api/agents/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-agent-token": agentToken },
    body: JSON.stringify({ status: "online", platform: process.platform }),
  })
}

async function fetchJob() {
  const response = await fetch(`${serverUrl}/api/agents/jobs`, {
    headers: { "x-agent-token": agentToken },
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json()
}

async function submitScan(scanId, assets, durationSeconds, summary) {
  const response = await fetch(`${serverUrl}/api/submit-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-agent-token": agentToken },
    body: JSON.stringify({ scanId, assets, durationSeconds, summary, platform: process.platform }),
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json()
}

while (true) {
  await heartbeat()
  const { job } = await fetchJob()

  if (!job) {
    console.log("No pending scan job")
    if (once) break
    await sleep(5000)
    continue
  }

  console.log(`Running scan ${job.id} against ${job.target}`)
  const startedAt = Date.now()
  const assets = await runNmap(job.target, job.scanType)
  const result = await submitScan(job.id, assets, Math.max(1, Math.round((Date.now() - startedAt) / 1000)), `Agent completed scan ${job.id}`)
  console.log(JSON.stringify(result, null, 2))

  if (once) break
}
