"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatsCard } from "@/components/stats-card"
import { RecentScansTable } from "@/components/recent-scans-table"
import { RiskDistributionChart } from "@/components/risk-distribution-chart"
import { AgentsStatus } from "@/components/agents-status"
import { AlertFeed } from "@/components/alert-feed"
import { Monitor, Shield, AlertTriangle, Server, Play, Calendar, TrendingDown, TrendingUp } from "lucide-react"
import Link from "next/link"
import { fetchDashboard, loadSession } from "@/lib/aetherscan-client"
import type { Agent, Alert, ScanResult, UserRole } from "@/lib/aetherscan/types"

const LIVE_REFRESH_MS = 5000

type QuickAction = {
  title: string
  description: string
  value: string
  tone: "red" | "amber" | "green"
  href: string
  cta: string
  icon: typeof AlertTriangle
}

function buildQuickActions(role: UserRole, stats: { resolvedIssues: number }, riskDistribution: { high: number; medium: number; low: number }): QuickAction[] {
  if (role === "admin") {
    return [
      {
        title: "Critical Actions Needed",
        description: "High-risk vulnerabilities require remediation",
        value: `${riskDistribution.high}`,
        tone: "red",
        href: "/dashboard/vulnerabilities?risk=high",
        cta: "View & Remediate",
        icon: AlertTriangle,
      },
      {
        title: "Pending Reviews",
        description: "Medium-risk items awaiting review",
        value: `${riskDistribution.medium}`,
        tone: "amber",
        href: "/dashboard/vulnerabilities?risk=medium",
        cta: "Review Now",
        icon: TrendingUp,
      },
      {
        title: "Resolved Issues",
        description: "Findings marked as resolved in the platform",
        value: `${stats.resolvedIssues}`,
        tone: "green",
        href: "/dashboard/reports",
        cta: "View Reports",
        icon: TrendingDown,
      },
    ]
  }

  if (role === "engineer") {
    return [
      {
        title: "My High Risk Queue",
        description: "High-risk findings from your scans",
        value: `${riskDistribution.high}`,
        tone: "red",
        href: "/dashboard/vulnerabilities?risk=high",
        cta: "Review High Risk",
        icon: AlertTriangle,
      },
      {
        title: "My Pending Reviews",
        description: "Medium-risk findings waiting for action",
        value: `${riskDistribution.medium}`,
        tone: "amber",
        href: "/dashboard/vulnerabilities?risk=medium",
        cta: "Open Findings",
        icon: TrendingUp,
      },
      {
        title: "My Closed Findings",
        description: "Resolved issues from your owned scans",
        value: `${stats.resolvedIssues}`,
        tone: "green",
        href: "/dashboard/results",
        cta: "View Results",
        icon: TrendingDown,
      },
    ]
  }

  return [
    {
      title: "My Remediation Queue",
      description: "Open high-risk findings assigned to your view",
      value: `${riskDistribution.high}`,
      tone: "red",
      href: "/dashboard/vulnerabilities?risk=high",
      cta: "Open High Risk",
      icon: AlertTriangle,
    },
    {
      title: "Items To Review",
      description: "Medium-risk findings that still need review",
      value: `${riskDistribution.medium}`,
      tone: "amber",
      href: "/dashboard/vulnerabilities?risk=medium",
      cta: "Review Findings",
      icon: TrendingUp,
    },
    {
      title: "Resolved In My Queue",
      description: "Issues already marked as resolved",
      value: `${stats.resolvedIssues}`,
      tone: "green",
      href: "/dashboard/vulnerabilities?status=resolved",
      cta: "See Resolved",
      icon: TrendingDown,
    },
  ]
}

function quickActionClasses(tone: QuickAction["tone"]) {
  if (tone === "red") return {
    card: "border-l-4 border-l-red-500",
    icon: "text-red-500",
    value: "text-red-600",
  }
  if (tone === "amber") return {
    card: "border-l-4 border-l-amber-500",
    icon: "text-amber-500",
    value: "text-amber-600",
  }
  return {
    card: "border-l-4 border-l-green-500",
    icon: "text-green-500",
    value: "text-green-600",
  }
}

export default function DashboardPage() {
  const session = loadSession()
  const userRole = session?.user.role ?? "technician"
  const roleLabel = userRole === "admin" ? "Administrator" : userRole === "engineer" ? "Engineer" : "Technician"
  const overviewTitle = userRole === "admin" ? "Security Dashboard" : "My Security Dashboard"
  const overviewDescription = userRole === "admin"
    ? "Overview of the full platform security posture and recent scan activity"
    : "Overview of your assigned security activity, findings, and recent scans"
  const canManageScans = userRole === "admin" || userRole === "engineer"
  const alertFeedTitle = userRole === "admin" ? "Alert Feed" : "My Alert Feed"
  const alertFeedDescription = userRole === "admin"
    ? "Real-time security alerts and scan notifications"
    : "Alerts related to your scans, findings, and remediation workflow"
  const alertFeedEmpty = userRole === "admin"
    ? "No alerts yet. Queue a scan to start generating notifications."
    : "No personal alerts yet. Run or review a scan to start generating notifications."
  const alertFeedFooter = userRole === "admin" ? "View Latest Results" : "View My Results"
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [stats, setStats] = useState({ assets: 0, vulnerabilities: 0, highRisk: 0, resolvedIssues: 0, activeAgents: 0, totalAgents: 0 })
  const [riskDistribution, setRiskDistribution] = useState({ high: 0, medium: 0, low: 0 })
  const [recentScans, setRecentScans] = useState<ScanResult[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const quickActions = buildQuickActions(userRole, stats, riskDistribution)

  useEffect(() => {
    let cancelled = false

    const loadData = async (showSpinner = false) => {
      if (showSpinner) setLoading(true)
      try {
        const data = await fetchDashboard()
        if (cancelled) return
        setStats(data.stats)
        setRiskDistribution(data.riskDistribution)
        setRecentScans(data.recentScans)
        setAgents(data.agents)
        setAlerts(data.alerts)
        setError("")
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load dashboard")
      } finally {
        if (!cancelled && showSpinner) setLoading(false)
      }
    }

    void loadData(true)
    const interval = window.setInterval(() => {
      void loadData(false)
    }, LIVE_REFRESH_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{overviewTitle}</h1>
          <p className="text-muted-foreground">{overviewDescription}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/80">{roleLabel} view</p>
        </div>
        {canManageScans ? (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/scans">
                <Calendar className="mr-2 size-4" />
                Schedule Scan
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/scans">
                <Play className="mr-2 size-4" />
                Run Scan Now
              </Link>
            </Button>
          </div>
        ) : (
          <Button variant="outline" asChild>
            <Link href="/dashboard/vulnerabilities">
              <Shield className="mr-2 size-4" />
              Review Findings
            </Link>
          </Button>
        )}
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title={userRole === "admin" ? "Total Assets" : "My Assets"} value={loading ? "..." : stats.assets} description={userRole === "admin" ? "Discovered network devices" : "Assets discovered from your scans"} icon={Monitor} />
        <StatsCard title={userRole === "admin" ? "Vulnerabilities" : "My Vulnerabilities"} value={loading ? "..." : stats.vulnerabilities} description={userRole === "admin" ? "Active security issues" : "Active findings from your scans"} icon={Shield} variant="warning" />
        <StatsCard title={userRole === "admin" ? "High Risk" : "My High Risk"} value={loading ? "..." : stats.highRisk} description={userRole === "admin" ? "Requires immediate attention" : "High-risk findings requiring your attention"} icon={AlertTriangle} variant="danger" />
        <StatsCard title="Active Agents" value={loading ? "..." : `${stats.activeAgents}/${stats.totalAgents}`} description="Shared team scanning agents" icon={Server} variant="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RiskDistributionChart counts={riskDistribution} />
        <AgentsStatus
          agents={agents}
          title="Shared Agents Status"
          description="Team-wide scanning agents available across the platform"
          emptyState="No shared agents registered yet."
        />
        <AlertFeed
          alerts={alerts}
          title={alertFeedTitle}
          description={alertFeedDescription}
          emptyState={alertFeedEmpty}
          footerLabel={alertFeedFooter}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{userRole === "admin" ? "Recent Scan Results" : "My Recent Scan Results"}</CardTitle>
            <CardDescription>{userRole === "admin" ? "Latest network scans and their findings" : "Latest scans you created and their findings"}</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/results">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <RecentScansTable scans={recentScans} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => {
          const classes = quickActionClasses(action.tone)
          const ActionIcon = action.icon
          return (
            <Card key={action.title} className={classes.card}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ActionIcon className={`size-4 ${classes.icon}`} />
                  {action.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${classes.value}`}>{loading ? "..." : action.value}</p>
                <p className="mb-3 text-sm text-muted-foreground">{action.description}</p>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={action.href}>{action.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
