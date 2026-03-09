import { NextResponse } from "next/server"
import { requireUser } from "@/lib/aetherscan/auth"
import { readDatabase } from "@/lib/aetherscan/store"

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response

  const database = await readDatabase()
  const openFindings = database.findings.filter((finding) => finding.status !== "resolved")
  const activeAgents = database.agents.filter((agent) => agent.status === "online" || agent.status === "occupied")

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
    alerts: database.alerts.slice(-6).reverse(),
    agents: database.agents.map(({ authToken: _authToken, ...agent }) => agent),
  })
}
