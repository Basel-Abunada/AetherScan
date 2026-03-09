import { NextResponse } from "next/server"
import { requireAgent } from "@/lib/aetherscan/auth"
import { sendNotificationEmail } from "@/lib/aetherscan/email"
import { buildReportContent } from "@/lib/aetherscan/reports"
import { finalizeScan } from "@/lib/aetherscan/scan-service"
import { updateDatabase } from "@/lib/aetherscan/store"
import { makeId, nowIso } from "@/lib/aetherscan/utils"

type IncomingAsset = {
  ipAddress: string
  hostname: string
  os?: string
  deviceType?: "server" | "workstation" | "laptop" | "printer" | "router" | "mobile" | "switch" | "iot" | "unknown"
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
    deviceType: asset.deviceType ?? "unknown",
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

  const completion = await updateDatabase((database) => {
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

    if (!result?.scan) return null

    if (database.settings.system.autoGenerateReports) {
      const generatedAt = nowIso()
      const reportId = makeId("report")
      const content = buildReportContent({
        type: "scan",
        format: "pdf",
        scans: database.scans,
        findings: database.findings,
        assets: database.assets,
      })
      database.reports.push({
        id: reportId,
        name: `AetherScan scan report ${result.scan.id}`,
        type: "scan",
        format: "pdf",
        generatedAt,
        generatedBy: auth.agent?.name ?? "Agent",
        sizeBytes: content.length,
        downloadPath: `/api/reports/${reportId}/download`,
      })
    }

    return {
      scan: result.scan,
      highRiskCount: result.vulnerabilities.high,
      database,
    }
  })

  if (!completion?.scan) return NextResponse.json({ error: "Queued scan not found" }, { status: 404 })

  if (completion.database.settings.notifications.scanCompletion) {
    await sendNotificationEmail(completion.database, {
      subject: `AetherScan scan completed: ${completion.scan.target}`,
      text: `Scan ${completion.scan.id} completed successfully. Hosts detected: ${completion.scan.totalHosts}. High risk findings: ${completion.highRiskCount}.`,
    }).catch(() => null)
  }

  if (completion.highRiskCount > 0 && completion.database.settings.notifications.highRiskAlerts) {
    await sendNotificationEmail(completion.database, {
      subject: `AetherScan high-risk findings detected on ${completion.scan.target}`,
      text: `Scan ${completion.scan.id} identified ${completion.highRiskCount} high-risk finding(s). Review the Vulnerabilities page immediately.`,
    }).catch(() => null)
  }

  return NextResponse.json({ completedScan: completion.scan })
}
