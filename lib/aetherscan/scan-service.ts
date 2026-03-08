import type { Asset, DemoDatabase, ScanMode, ScanResult, ScanType } from "@/lib/aetherscan/types"
import { buildFindingsForAssets, summarizeFindings } from "@/lib/aetherscan/risk-engine"
import { makeId, nowIso } from "@/lib/aetherscan/utils"

export function createQueuedScan(database: DemoDatabase, input: {
  agentId: string
  agentName: string
  target: string
  scanType: ScanType
  mode: ScanMode
}) {
  const scan: ScanResult = {
    id: makeId("scan"),
    agentId: input.agentId,
    agentName: input.agentName,
    target: input.target,
    scanType: input.scanType,
    mode: input.mode,
    status: "queued",
    startedAt: nowIso(),
    totalHosts: 0,
    assetIds: [],
    findingIds: [],
    vulnerabilities: { high: 0, medium: 0, low: 0 },
    summary: "Queued for agent execution",
  }
  database.scans.push(scan)
  return scan
}

export function markScanRunning(database: DemoDatabase, scanId: string) {
  const scan = database.scans.find((entry) => entry.id === scanId)
  if (!scan) return null
  scan.status = "running"
  scan.startedAt = nowIso()
  scan.summary = "Agent is executing the scan"
  return scan
}

export function finalizeScan(database: DemoDatabase, input: { scanId: string; assets: Asset[]; durationSeconds: number; summary?: string }) {
  const scan = database.scans.find((entry) => entry.id === input.scanId)
  if (!scan) return null

  const findings = buildFindingsForAssets(scan.id, input.assets)
  const vulnerabilities = summarizeFindings(findings)
  const completedAt = nowIso()

  database.assets.push(...input.assets)
  database.findings.push(...findings)

  scan.status = "completed"
  scan.completedAt = completedAt
  scan.durationSeconds = Math.max(1, input.durationSeconds)
  scan.totalHosts = input.assets.length
  scan.assetIds = input.assets.map((asset) => asset.id)
  scan.findingIds = findings.map((finding) => finding.id)
  scan.vulnerabilities = vulnerabilities
  scan.summary = input.summary ?? `Detected ${findings.length} findings across ${input.assets.length} hosts`

  for (const finding of findings.filter((entry) => entry.riskLevel === "high")) {
    database.alerts.push({
      id: makeId("alert"),
      severity: "high",
      title: `High risk detected on ${finding.service}`,
      message: `${finding.title} detected on asset ${finding.assetId}`,
      createdAt: completedAt,
      acknowledged: false,
    })
  }

  return { scan, findings, vulnerabilities }
}

export function failScan(database: DemoDatabase, scanId: string, message: string) {
  const scan = database.scans.find((entry) => entry.id === scanId)
  if (!scan) return null
  scan.status = "failed"
  scan.completedAt = nowIso()
  scan.summary = message
  return scan
}
