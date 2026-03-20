import { NextResponse } from "next/server"
import { getVisibleFindings } from "@/lib/aetherscan/access"
import { requireUser } from "@/lib/aetherscan/auth"
import { readDatabase } from "@/lib/aetherscan/store"

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response

  const { searchParams } = new URL(request.url)
  const risk = searchParams.get("risk")
  const status = searchParams.get("status")
  const q = (searchParams.get("q") ?? "").toLowerCase()
  const database = await readDatabase()

  const visibleAssets = new Map(database.assets.map((asset) => [asset.id, asset]))
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
      return {
        ...finding,
        affectedHost: asset?.ipAddress ?? finding.assetId,
        hostname: asset?.hostname ?? "unknown",
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
