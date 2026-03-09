import { NextResponse } from "next/server"
import { requireUser } from "@/lib/aetherscan/auth"
import { readDatabase } from "@/lib/aetherscan/store"

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response

  const database = await readDatabase()
  const openFindings = database.findings.filter((finding) => finding.status !== "resolved")
  const openFindingIds = new Set(openFindings.map((finding) => finding.id))
  const activeAgents = database.agents.filter((agent) => agent.status === "online" || agent.status === "occupied")
  const visibleAlerts = database.alerts.filter((alert) => {
    if (alert.findingId) return openFindingIds.has(alert.findingId)
    if (alert.category === "finding-high" || alert.category === "finding-medium") return false
    return true
  })

  return NextResponse.json({
    stats: {
      assets: database.assets.length,
      vulnerabilities: openFindings.length,
      highRisk: openFindings.filter((finding) => finding.riskLevel === "high").length,
      activeAgents: activeAgents.length,
      totalAgents: database.agents.length,
    },
    riskDistribution: {
      high: openFindings.filter((finding) => finding.riskLevel === "high").length,
      medium: openFindings.filter((finding) => finding.riskLevel === "medium").length,
      low: openFindings.filter((finding) => finding.riskLevel === "low").length,
    },
    recentScans: database.scans.slice(-5).reverse(),
    alerts: visibleAlerts.slice(-6).reverse(),
    agents: database.agents.map(({ authToken: _authToken, ...agent }) => agent),
  })
}
