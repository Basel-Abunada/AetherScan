import { spawn } from "node:child_process"
import type { Asset, AssetService, ScanMode, ScanType } from "@/lib/aetherscan/types"
import { demoProfiles } from "@/lib/aetherscan/demo-profiles"
import { makeId, nowIso } from "@/lib/aetherscan/utils"

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function assetWithTimestamps(asset: Omit<Asset, "id" | "discoveredAt" | "lastSeenAt">): Asset {
  const timestamp = nowIso()
  return {
    ...asset,
    id: makeId("asset"),
    discoveredAt: timestamp,
    lastSeenAt: timestamp,
  }
}

async function runDemoProfile(target: string) {
  await delay(350)
  const profile = demoProfiles[target] ?? demoProfiles["demo-hq"]
  return profile.map(assetWithTimestamps)
}

function parseServices(portSegment: string): AssetService[] {
  return portSegment
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const [portProto, state, , service] = segment.split("/")
      const [port] = portProto.split("/")
      return {
        port: Number(port),
        protocol: "tcp" as const,
        name: service || "unknown",
        state: (state as AssetService["state"]) || "open",
      }
    })
    .filter((service) => Number.isFinite(service.port) && service.state === "open")
}

async function runLiveNmap(target: string, scanType: ScanType): Promise<Asset[]> {
  const args = ["-oG", "-", "-sV", target]
  if (scanType === "quick") args.unshift("--top-ports", "100")
  if (scanType === "full") args.unshift("-p-")
  if (scanType === "vuln") args.unshift("--script", "vuln")

  return new Promise((resolve, reject) => {
    const child = spawn("nmap", args, { windowsHide: true })
    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })

    child.on("error", (error) => reject(error))
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `nmap exited with code ${code}`))
        return
      }

      const assets = stdout
        .split(/\r?\n/)
        .filter((line) => line.startsWith("Host:") && line.includes("Ports:"))
        .map((line) => {
          const hostMatch = line.match(/^Host:\s+([^\s]+)\s+\(([^)]*)\)/)
          const portsMatch = line.match(/Ports:\s+(.+)$/)
          const ipAddress = hostMatch?.[1] ?? "unknown"
          const hostname = hostMatch?.[2] || ipAddress
          const services = parseServices(portsMatch?.[1] ?? "")
          return assetWithTimestamps({
            ipAddress,
            hostname,
            os: undefined,
            status: "up",
            services,
          })
        })

      resolve(assets)
    })
  })
}

export async function executeScan({
  target,
  mode,
  scanType,
}: {
  target: string
  mode: ScanMode
  scanType: ScanType
}) {
  if (mode === "demo") {
    return runDemoProfile(target)
  }

  try {
    return await runLiveNmap(target, scanType)
  } catch {
    return runDemoProfile("demo-hq")
  }
}
