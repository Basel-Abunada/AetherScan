"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatsCard } from "@/components/stats-card"
import { RecentScansTable } from "@/components/recent-scans-table"
import { RiskDistributionChart } from "@/components/risk-distribution-chart"
import { AgentsStatus } from "@/components/agents-status"
import { Monitor, Shield, AlertTriangle, Server, Calendar, TrendingDown, TrendingUp, Bell } from "lucide-react"
import Link from "next/link"
import { fetchDashboard, formatDateTime } from "@/lib/aetherscan-client"
import type { Agent, Alert, ScanResult } from "@/lib/aetherscan/types"

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [stats, setStats] = useState({ assets: 0, vulnerabilities: 0, highRisk: 0, activeAgents: 0, totalAgents: 0 })
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
    }, 15000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Security Dashboard</h1><p className="text-muted-foreground">Overview of current network security status and scan activity</p></div>
        <div className="flex gap-2"><Button variant="outline" asChild><Link href="/dashboard/scans"><Calendar className="mr-2 size-4" />Schedule Scan</Link></Button><Button asChild><Link href="/dashboard/scans">Queue Scan</Link></Button></div>
      </div>
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatsCard title="Total Assets" value={loading ? "..." : stats.assets} description="Discovered network devices" icon={Monitor} /><StatsCard title="Vulnerabilities" value={loading ? "..." : stats.vulnerabilities} description="Active security issues" icon={Shield} variant="warning" /><StatsCard title="High Risk" value={loading ? "..." : stats.highRisk} description="Requires immediate attention" icon={AlertTriangle} variant="danger" /><StatsCard title="Active Agents" value={loading ? "..." : `${stats.activeAgents}/${stats.totalAgents}`} description="Online scanning agents" icon={Server} variant="success" /></div>
      <div className="grid gap-6 lg:grid-cols-2"><RiskDistributionChart counts={riskDistribution} /><AgentsStatus agents={agents} /></div>
      <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Recent Scan Results</CardTitle><CardDescription>Latest completed network scans and their findings</CardDescription></div><Button variant="outline" size="sm" asChild><Link href="/dashboard/results">View All</Link></Button></CardHeader><CardContent><RecentScansTable scans={recentScans} /></CardContent></Card>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Card className="border-l-4 border-l-red-500"><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="size-4 text-red-500" />Critical Actions Needed</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{riskDistribution.high}</p><p className="text-sm text-muted-foreground mb-3">High-risk vulnerabilities require remediation</p><Button variant="outline" size="sm" className="w-full" asChild><Link href="/dashboard/vulnerabilities?risk=high">View & Remediate</Link></Button></CardContent></Card><Card className="border-l-4 border-l-amber-500"><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="size-4 text-amber-500" />Pending Reviews</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{riskDistribution.medium}</p><p className="text-sm text-muted-foreground mb-3">Medium-risk items awaiting review</p><Button variant="outline" size="sm" className="w-full" asChild><Link href="/dashboard/vulnerabilities?risk=medium">Review Now</Link></Button></CardContent></Card><Card className="border-l-4 border-l-green-500"><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="size-4 text-green-500" />Recent Alerts</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{alerts.length}</p><p className="text-sm text-muted-foreground mb-3">Scan lifecycle and risk notifications</p><Button variant="outline" size="sm" className="w-full" asChild><Link href="/dashboard#alert-feed">View Feed</Link></Button></CardContent></Card></div>
        <Card id="alert-feed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="size-4" />Alert Feed</CardTitle>
            <CardDescription>Queued scans, started scans, completed scans, and medium/high findings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length ? alerts.map((alert) => (
              <div key={alert.id} className="rounded-lg border p-3">
                <div className="mb-1 flex items-start justify-between gap-3">
                  <p className="font-medium leading-snug">{alert.title}</p>
                  <Badge variant="outline" className={alert.severity === "high" ? "border-red-200 bg-red-50 text-red-700" : alert.severity === "medium" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-700"}>{alert.severity}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(alert.createdAt)}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No alerts yet. Queue a scan to start generating notifications.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


