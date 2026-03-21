import { NextResponse } from "next/server"
import { getVisibleFindings } from "@/lib/aetherscan/access"
import { requireUser } from "@/lib/aetherscan/auth"
import { inferCweFallback, inferCweUrl } from "@/lib/aetherscan/risk-engine"
import { readDatabase } from "@/lib/aetherscan/store"

function primaryTarget(target?: string) {
  if (!target) return "unknown"
  return target.trim().split(/\s+/)[0] || "unknown"
}

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response

  const { searchParams } = new URL(request.url)
  const risk = searchParams.get("risk")
  const status = searchParams.get("status")
  const q = (searchParams.get("q") ?? "").toLowerCase()
  const database = await readDatabase()

  const visibleAssets = new Map(database.assets.map((asset) => [asset.id, asset]))
  const visibleScans = new Map(database.scans.map((scan) => [scan.id, scan]))
  const findings = getVisibleFindings(database, auth.user)
    .filter((finding) => (risk ? finding.riskLevel === risk : true))
    .filter((finding) => (status ? finding.status === status : true))
    .filter((finding) => !q
      || finding.title.toLowerCase().includes(q)
      || finding.service.toLowerCase().includes(q)
      || finding.description.toLowerCase().includes(q)
      || finding.cve?.toLowerCase().includes(q)
      || finding.source.toLowerCase().includes(q)
      || finding.recommendation.toLowerCase().includes(q))
    .map((finding) => {
      const asset = visibleAssets.get(finding.assetId)
      const scan = visibleScans.get(finding.scanId)
      const fallbackTarget = primaryTarget(scan?.target)
      const fallbackCwe = inferCweFallback(finding)
      return {
        ...finding,
        cwe: finding.cwe ?? fallbackCwe ?? undefined,
        cweUrl: finding.cweUrl ?? inferCweUrl(fallbackCwe),
        affectedHost: asset?.ipAddress ?? fallbackTarget,
        hostname: asset?.hostname ?? fallbackTarget,
      }
    })

  return NextResponse.json({
    counts: {
      total: findings.length,
      high: findings.filter((finding) => finding.riskLevel === "high").length,
      medium: findings.filter((finding) => finding.riskLevel === "medium").length,
      low: findings.filter((finding) => finding.riskLevel === "low").length,
    },
    findings,
  })
}
