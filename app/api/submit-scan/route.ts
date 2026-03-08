import { NextResponse } from "next/server"
import { requireAgent } from "@/lib/aetherscan/auth"
import { finalizeScan } from "@/lib/aetherscan/scan-service"
import { updateDatabase } from "@/lib/aetherscan/store"
import { makeId } from "@/lib/aetherscan/utils"

type IncomingAsset = {
  ipAddress: string
  hostname: string
  os?: string
  status?: "up" | "down"
  services?: Array<{ port: number; protocol?: "tcp" | "udp"; name: string; product?: string; version?: string; state?: "open" | "closed" | "filtered" }>
}

export async function POST(request: Request) {
  const auth = await requireAgent(request)
  if (!auth.agent) return auth.response
  const body = await request.json()
  const scanId = String(body.scanId ?? "")
  if (!scanId) return NextResponse.json({ error: "scanId is required" }, { status: 400 })

  const assetsInput = Array.isArray(body.assets) ? (body.assets as IncomingAsset[]) : []
  const assets = assetsInput.map((asset) => ({
    id: makeId("asset"),
    ipAddress: asset.ipAddress,
    hostname: asset.hostname || asset.ipAddress,
    os: asset.os,
    status: asset.status ?? "up",
    discoveredAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    services: (asset.services ?? []).map((service) => ({
      port: Number(service.port),
      protocol: service.protocol ?? "tcp",
      name: service.name,
      product: service.product,
      version: service.version,
      state: service.state ?? "open",
    })),
  }))

  const completedScan = await updateDatabase((database) => {
    const result = finalizeScan(database, {
      scanId,
      assets,
      durationSeconds: Number(body.durationSeconds ?? 1),
      summary: body.summary ? String(body.summary) : undefined,
    })
    const agent = database.agents.find((entry) => entry.id === auth.agent?.id)
    if (agent) {
      agent.lastSeenAt = new Date().toISOString()
      agent.status = "online"
      if (body.ipAddress) agent.ipAddress = String(body.ipAddress)
      if (body.platform) agent.platform = String(body.platform)
    }
    return result?.scan ?? null
  })

  if (!completedScan) return NextResponse.json({ error: "Queued scan not found" }, { status: 404 })
  return NextResponse.json({ completedScan })
}
