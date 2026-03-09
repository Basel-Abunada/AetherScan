import { XMLParser } from "fast-xml-parser"
import { spawn } from "node:child_process"

const serverUrl = process.env.AETHERSCAN_SERVER_URL || "http://localhost:3001"
const agentToken = process.env.AETHERSCAN_AGENT_TOKEN
const once = process.env.AETHERSCAN_ONCE === "true"
const POLL_INTERVAL_MS = 5000
const REQUEST_TIMEOUT_MS = 15000

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

function limitText(value, maxLength = 4000) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`
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

function flattenScriptOutput(node, lines = []) {
  if (!node || typeof node !== "object") return lines
  if (typeof node.output === "string" && node.output.trim()) lines.push(node.output.trim())

  for (const elem of normalizeArray(node.elem)) {
    if (typeof elem === "string") {
      if (elem.trim()) lines.push(elem.trim())
      continue
    }

    const key = elem.key ? `${elem.key}: ` : ""
    const text = typeof elem["#text"] === "string" ? elem["#text"].trim() : ""
    if (text) lines.push(`${key}${text}`.trim())
    flattenScriptOutput(elem, lines)
  }

  for (const table of normalizeArray(node.table)) {
    if (table.key) lines.push(String(table.key))
    flattenScriptOutput(table, lines)
  }

  return lines
}

function extractScripts(scriptNodes) {
  return normalizeArray(scriptNodes)
    .map((script) => {
      const id = String(script.id || "unknown-script")
      const output = Array.from(new Set(flattenScriptOutput(script))).join(" | ")
      return { id, output: limitText(output || "NSE script returned a result without textual output.") }
    })
    .filter((script) => script.id && script.output)
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
          scripts: extractScripts(port.script),
        }))

      return {
        ipAddress: ipv4,
        hostname,
        os: osMatch?.name || undefined,
        deviceType: inferDeviceType(host),
        status: "up",
        services,
        hostScripts: extractScripts(host.hostscript?.script),
      }
    })
}

function buildNmapArgs(scanType) {
  const args = ["-oX", "-", "-n", "-T4", "--max-retries", "2", "-sV"]

  if (scanType === "quick") {
    args.push("--top-ports", "100", "--version-light", "--host-timeout", "4m")
  } else if (scanType === "standard") {
    args.push("--top-ports", "1000", "--version-light", "--host-timeout", "5m")
  } else if (scanType === "full") {
    args.push("-p-", "-O", "--version-all", "--host-timeout", "8m")
  } else if (scanType === "vuln") {
    args.push("--top-ports", "1000", "-O", "--script", "vuln", "--script-timeout", "2m", "--host-timeout", "10m")
  }

  return args
}

function runNmap(target, scanType) {
  const args = [...buildNmapArgs(scanType), target]

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

async function request(path, init = {}) {
  return fetch(`${serverUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
}

async function heartbeat(status = "online") {
  const response = await request("/api/agents/heartbeat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-agent-token": agentToken },
    body: JSON.stringify({ status, platform: process.platform }),
  })
  if (!response.ok) throw new Error(`Heartbeat failed (${response.status})`)
}

async function fetchJob() {
  const response = await request("/api/agents/jobs", {
    headers: { "x-agent-token": agentToken },
  })
  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(`Fetch job failed (${response.status}): ${message || "Unknown error"}`)
  }
  return response.json()
}

async function submitScan(scanId, assets, durationSeconds, summary) {
  const response = await request("/api/submit-scan", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-agent-token": agentToken },
    body: JSON.stringify({ scanId, assets, durationSeconds, summary, platform: process.platform }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`Submit scan failed (${response.status}): ${text || "Unknown server error"}`)
  }
  return response.json()
}

async function markScanFailed(scanId, message) {
  const response = await request(`/api/scans/${scanId}/fail`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-agent-token": agentToken },
    body: JSON.stringify({ message, platform: process.platform }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`Mark scan failed failed (${response.status}): ${text || "Unknown server error"}`)
  }
}

function describeError(error) {
  if (!(error instanceof Error)) return "Unknown agent error"
  if (error.cause?.code === "UND_ERR_CONNECT_TIMEOUT") {
    return `Cannot reach ${serverUrl}. Connection timed out. Verify the Windows server IP, port, and firewall settings.`
  }
  if (error.cause?.code === "ECONNREFUSED") {
    return `Connection refused by ${serverUrl}. Make sure the AetherScan web app is running and reachable from Kali.`
  }
  return error.message
}

while (true) {
  try {
    await heartbeat("online")
    const { job } = await fetchJob()

    if (!job) {
      console.log("No pending scan job")
      if (once) break
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    try {
      console.log(`Running scan ${job.id} against ${job.target} with profile ${job.scanType}`)
      const startedAt = Date.now()
      const assets = await runNmap(job.target, job.scanType)
      const summary = `Agent completed ${job.scanType} scan ${job.id} with ${assets.length} discovered host(s)`
      const result = await submitScan(job.id, assets, Math.max(1, Math.round((Date.now() - startedAt) / 1000)), summary)
      console.log(JSON.stringify(result, null, 2))
    } catch (error) {
      const message = describeError(error)
      console.error(message)
      await heartbeat("degraded").catch(() => null)
      await markScanFailed(job.id, message).catch((markError) => {
        console.error(describeError(markError))
      })
      if (once) throw error
    }
  } catch (error) {
    const message = describeError(error)
    console.error(message)
    if (once) throw error
    await sleep(POLL_INTERVAL_MS)
    continue
  }

  if (once) break
}

if (once) {
  await heartbeat("offline").catch(() => null)
}

