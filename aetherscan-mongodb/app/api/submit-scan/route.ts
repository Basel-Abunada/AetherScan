import { NextResponse } from "next/server"
import { requireAgent } from "@/lib/aetherscan/auth"
import { sendNotificationEmail } from "@/lib/aetherscan/email"
import { buildReportContent } from "@/lib/aetherscan/reports"
import { finalizeScan } from "@/lib/aetherscan/scan-service"
import { updateDatabase } from "@/lib/aetherscan/store"
import { makeId, nowIso } from "@/lib/aetherscan/utils"

type IncomingScript = {
  id: string
  output?: string
}

type IncomingAsset = {
  ipAddress: string
  hostname: string
  os?: string
  deviceType?: "server" | "workstation" | "laptop" | "printer" | "router" | "mobile" | "switch" | "iot" | "unknown"
  status?: "up" | "down"
  hostScripts?: IncomingScript[]
  services?: Array<{ port: number; protocol?: "tcp" | "udp"; name: string; product?: string; version?: string; state?: "open" | "closed" | "filtered"; scripts?: IncomingScript[] }>
}

export async function POST(request: Request) {
  try {
    const auth = await requireAgent(request)
    if (!auth.agent) return auth.response
    const body = await request.json()
    const scanId = String(body.scanId ?? "")
    if (!scanId) return NextResponse.json({ error: "scanId is required" }, { status: 400 })

    const assetsInput = Array.isArray(body.assets) ? (body.assets as IncomingAsset[]) : []
    const assets = assetsInput.map((asset) => ({
      id: makeId("asset"),
      ipAddress: String(asset.ipAddress ?? "unknown"),
      hostname: String(asset.hostname ?? asset.ipAddress ?? "unknown-host"),
      os: asset.os == null ? undefined : String(asset.os),
      deviceType: asset.deviceType ?? "unknown",
      status: asset.status ?? "up",
      discoveredAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      hostScripts: (asset.hostScripts ?? []).map((script) => ({
        id: String(script.id ?? "unknown-script"),
        output: String(script.output ?? ""),
      })),
      services: (asset.services ?? []).map((service) => ({
        port: Number(service.port),
        protocol: service.protocol ?? "tcp",
        name: String(service.name ?? "unknown"),
        product: service.product == null ? undefined : String(service.product),
        version: service.version == null ? undefined : String(service.version),
        state: service.state ?? "open",
        scripts: (service.scripts ?? []).map((script) => ({
          id: String(script.id ?? "unknown-script"),
          output: String(script.output ?? ""),
        })),
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

      database.alerts.unshift({
        id: makeId("alert"),
        severity: "low",
        title: `Scan completed: ${result.scan.target}`,
        message: `Agent ${auth.agent?.name ?? "Unknown agent"} completed the ${result.scan.scanType} scan for ${result.scan.target}.`,
        createdAt: nowIso(),
        acknowledged: false,
        category: "scan-completed",
        scanId: result.scan.id,
      })

      for (const finding of result.findings.filter((entry) => entry.riskLevel === "high" || entry.riskLevel === "medium")) {
        database.alerts.unshift({
          id: makeId("alert"),
          severity: finding.riskLevel,
          title: `${finding.riskLevel === "high" ? "High" : "Medium"} finding: ${finding.title}`,
          message: `${finding.title} detected on ${finding.service}/${finding.port}${finding.cve ? ` (${finding.cve})` : ""}.`,
          createdAt: nowIso(),
          acknowledged: false,
          category: finding.riskLevel === "high" ? "finding-high" : "finding-medium",
          scanId: result.scan.id,
          findingId: finding.id,
          assetId: finding.assetId,
        })
      }

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
        mediumRiskCount: result.vulnerabilities.medium,
        database,
      }
    })

    if (!completion?.scan) return NextResponse.json({ error: "Queued scan not found" }, { status: 404 })

    if (completion.database.settings.notifications.scanCompletion) {
      await sendNotificationEmail(completion.database, {
        subject: `AetherScan scan completed: ${completion.scan.target}`,
        text: `Scan ${completion.scan.id} completed successfully. Hosts detected: ${completion.scan.totalHosts}. High risk findings: ${completion.highRiskCount}. Medium risk findings: ${completion.mediumRiskCount}.`,
      }).catch(() => null)
    }

    if (completion.highRiskCount > 0 && completion.database.settings.notifications.highRiskAlerts) {
      await sendNotificationEmail(completion.database, {
        subject: `AetherScan high-risk findings detected on ${completion.scan.target}`,
        text: `Scan ${completion.scan.id} identified ${completion.highRiskCount} high-risk finding(s). Review the Vulnerabilities page immediately.`,
      }).catch(() => null)
    }

    return NextResponse.json({ completedScan: completion.scan })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to submit scan" }, { status: 500 })
  }
}

