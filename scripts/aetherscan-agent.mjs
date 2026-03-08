import { XMLParser } from "fast-xml-parser"
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

function normalizeArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function inferDeviceType(host) {
  const osMatches = normalizeArray(host.os?.osmatch)
  const osText = osMatches.map((match) => match.name || "").join(" ").toLowerCase()
  const services = normalizeArray(host.ports?.port).map((port) => port.service?.name || "").join(" ").toLowerCase()
  const hostname = normalizeArray(host.hostnames?.hostname).map((entry) => entry.name || "").join(" ").toLowerCase()
  const fingerprint = `${osText} ${services} ${hostname}`

  if (fingerprint.includes("router") || fingerprint.includes("gateway") || fingerprint.includes("mikrotik") || fingerprint.includes("cisco ios")) return "router"
  if (fingerprint.includes("printer") || fingerprint.includes("jetdirect")) return "printer"
  if (fingerprint.includes("android") || fingerprint.includes("iphone")) return "mobile"
  if (fingerprint.includes("camera") || fingerprint.includes("iot")) return "iot"
  if (fingerprint.includes("switch")) return "switch"
  if (fingerprint.includes("ubuntu") || fingerprint.includes("debian") || fingerprint.includes("centos") || fingerprint.includes("linux") || fingerprint.includes("windows server") || fingerprint.includes("vmware") || fingerprint.includes("hyper-v")) return "server"
  if (fingerprint.includes("macbook") || fingerprint.includes("laptop")) return "laptop"
  if (fingerprint.includes("windows") || fingerprint.includes("workstation")) return "workstation"
  return "unknown"
}

function parseNmapXml(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseAttributeValue: true,
  })
  const parsed = parser.parse(xml)
  const hosts = normalizeArray(parsed.nmaprun?.host)

  return hosts
    .filter((host) => host.status?.state === "up")
    .map((host) => {
      const addressEntries = normalizeArray(host.address)
      const ipv4 = addressEntries.find((entry) => entry.addrtype === "ipv4")?.addr || "unknown"
      const hostname = normalizeArray(host.hostnames?.hostname)[0]?.name || ipv4
      const osMatch = normalizeArray(host.os?.osmatch)[0]
      const services = normalizeArray(host.ports?.port)
        .filter((port) => port.state?.state === "open")
        .map((port) => ({
          port: Number(port.portid),
          protocol: port.protocol === "udp" ? "udp" : "tcp",
          name: port.service?.name || port.service?.product || "unknown",
          product: port.service?.product || undefined,
          version: port.service?.version || undefined,
          state: "open",
        }))

      return {
        ipAddress: ipv4,
        hostname,
        os: osMatch?.name || undefined,
        deviceType: inferDeviceType(host),
        status: "up",
        services,
      }
    })
}

function runNmap(target, scanType) {
  const args = ["-oX", "-", "-sV", "-O", target]
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
      resolve(parseNmapXml(stdout))
    })
  })
}

async function heartbeat(status = "online") {
  await fetch(`${serverUrl}/api/agents/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-agent-token": agentToken },
    body: JSON.stringify({ status, platform: process.platform }),
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

try {
  while (true) {
    await heartbeat("online")
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
} finally {
  if (once) {
    await heartbeat("offline").catch(() => null)
  }
}
