import { NextResponse } from "next/server"
import { requireUser } from "@/lib/aetherscan/auth"
import { readDatabase } from "@/lib/aetherscan/store"

function isFindingAlert(title: string, message: string, category?: string) {
  const lowerTitle = title.toLowerCase()
  const lowerMessage = message.toLowerCase()
  if (category === "finding-high" || category === "finding-medium") return true
  return lowerTitle.startsWith("high risk detected") ||
    lowerTitle.startsWith("medium risk detected") ||
    lowerTitle.startsWith("high finding:") ||
    lowerTitle.startsWith("medium finding:") ||
    lowerMessage.includes("detected on asset")
}

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response

  const database = await readDatabase()
  const openFindings = database.findings.filter((finding) => finding.status !== "resolved")
  const openFindingIds = new Set(openFindings.map((finding) => finding.id))
  const activeAgents = database.agents.filter((agent) => agent.status === "online" || agent.status === "occupied")
  const visibleAlerts = [] as typeof database.alerts
  const seenOfflineAgents = new Set<string>()

  for (const alert of database.alerts) {
    const alertTitle = alert.title.toLowerCase()
    const alertMessage = alert.message.toLowerCase()

    if (alertTitle.startsWith("agent offline:")) {
      const agentName = alert.title.slice("Agent offline:".length).trim().toLowerCase()
      if (seenOfflineAgents.has(agentName)) continue
      seenOfflineAgents.add(agentName)
    }

    if (isFindingAlert(alert.title, alert.message, alert.category)) {
      const matchesOpenFinding = alert.findingId
        ? openFindingIds.has(alert.findingId)
        : openFindings.some((finding) => {
            const findingTitle = finding.title.toLowerCase()
            const findingCve = finding.cve?.toLowerCase()
            const servicePort = `${finding.service}/${finding.port}`.toLowerCase()
            return alertTitle.includes(findingTitle) ||
              alertMessage.includes(findingTitle) ||
              (findingCve ? alertTitle.includes(findingCve) || alertMessage.includes(findingCve) : false) ||
              alertMessage.includes(servicePort) ||
              alertMessage.includes(finding.assetId.toLowerCase())
          })

      if (!matchesOpenFinding) continue
    }

    visibleAlerts.push(alert)
  }

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
    alerts: visibleAlerts,
    agents: database.agents.map(({ authToken: _authToken, ...agent }) => agent),
  })
}

