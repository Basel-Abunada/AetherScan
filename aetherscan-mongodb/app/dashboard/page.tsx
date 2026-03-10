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
import { fetchDashboard } from "@/lib/aetherscan-client"
import type { Agent, Alert, ScanResult } from "@/lib/aetherscan/types"

const LIVE_REFRESH_MS = 5000

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [stats, setStats] = useState({ assets: 0, vulnerabilities: 0, highRisk: 0, resolvedIssues: 0, activeAgents: 0, totalAgents: 0 })
  const [riskDistribution, setRiskDistribution] = useState({ high: 0, medium: 0, low: 0 })
  const [recentScans, setRecentScans] = useState<ScanResult[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])

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
          <h1 className="text-2xl font-bold tracking-tight">Security Dashboard</h1>
          <p className="text-muted-foreground">Overview of your network security status and recent scan activity</p>
        </div>
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
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Assets" value={loading ? "..." : stats.assets} description="Discovered network devices" icon={Monitor} />
        <StatsCard title="Vulnerabilities" value={loading ? "..." : stats.vulnerabilities} description="Active security issues" icon={Shield} variant="warning" />
        <StatsCard title="High Risk" value={loading ? "..." : stats.highRisk} description="Requires immediate attention" icon={AlertTriangle} variant="danger" />
        <StatsCard title="Active Agents" value={loading ? "..." : `${stats.activeAgents}/${stats.totalAgents}`} description="Online scanning agents" icon={Server} variant="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RiskDistributionChart counts={riskDistribution} />
        <AgentsStatus agents={agents} />
        <AlertFeed alerts={alerts} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Scan Results</CardTitle>
            <CardDescription>Latest network scans and their findings</CardDescription>
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
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-red-500" />
              Critical Actions Needed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{loading ? "..." : riskDistribution.high}</p>
            <p className="mb-3 text-sm text-muted-foreground">High-risk vulnerabilities require remediation</p>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/dashboard/vulnerabilities?risk=high">View & Remediate</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-amber-500" />
              Pending Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{loading ? "..." : riskDistribution.medium}</p>
            <p className="mb-3 text-sm text-muted-foreground">Medium-risk items awaiting review</p>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/dashboard/vulnerabilities?risk=medium">Review Now</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="size-4 text-green-500" />
              Resolved Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{loading ? "..." : stats.resolvedIssues}</p>
            <p className="mb-3 text-sm text-muted-foreground">Findings marked as resolved in the platform</p>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/dashboard/reports">View Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
