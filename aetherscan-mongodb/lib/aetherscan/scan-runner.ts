import { spawn } from "node:child_process"
import type { Asset, AssetService, ScanType } from "@/lib/aetherscan/types"
import { makeId, nowIso } from "@/lib/aetherscan/utils"

function assetWithTimestamps(asset: Omit<Asset, "id" | "discoveredAt" | "lastSeenAt">): Asset {
  const timestamp = nowIso()
  return {
    ...asset,
    id: makeId("asset"),
    discoveredAt: timestamp,
    lastSeenAt: timestamp,
  }
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

export async function executeScan({
  target,
  scanType,
}: {
  target: string
  scanType: ScanType
}) {
  const args = ["-oG", "-", "-n", "-T4", "--max-retries", "2", "--host-timeout", "5m", "-sV"]
  if (scanType === "quick") args.push("--top-ports", "100", "--version-light")
  if (scanType === "standard") args.push("--version-light")
  if (scanType === "full") args.push("-p-")
  if (scanType === "vuln") args.push("--script", "vuln")
  args.push(target)

  return new Promise<Asset[]>((resolve, reject) => {
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
