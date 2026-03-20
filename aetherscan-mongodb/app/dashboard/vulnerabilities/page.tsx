"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Filter, AlertTriangle, Shield, Info, CheckCircle, ExternalLink, Wrench, Trash2 } from "lucide-react"
import { RiskBadge } from "@/components/risk-badge"
import { deleteFinding, fetchVulnerabilities, formatDateTime, loadSession, updateFinding } from "@/lib/aetherscan-client"

type FindingRow = Awaited<ReturnType<typeof fetchVulnerabilities>>["findings"][number]

export default function VulnerabilitiesPage() {
  const role = loadSession()?.user.role
  const scopeLabel = role === "admin" ? "View and manage detected security vulnerabilities" : "View and manage vulnerabilities discovered from your scans"
  const [searchTerm, setSearchTerm] = useState("")
  const [riskFilter, setRiskFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedVuln, setSelectedVuln] = useState<FindingRow | null>(null)
  const [counts, setCounts] = useState({ total: 0, high: 0, medium: 0, low: 0 })
  const [findings, setFindings] = useState<FindingRow[]>([])
  const [error, setError] = useState("")
  const canDelete = role === "admin"

  const loadData = async () => {
    try {
      const data = await fetchVulnerabilities({ risk: riskFilter, status: statusFilter, q: searchTerm })
      setCounts(data.counts)
      setFindings(data.findings)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vulnerabilities")
    }
  }

  useEffect(() => {
    void loadData()
  }, [riskFilter, statusFilter, searchTerm])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Open</Badge>
      case "in-progress":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">In Progress</Badge>
      case "resolved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vulnerabilities</h1>
          <p className="text-muted-foreground">{scopeLabel}</p>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Vulnerabilities</CardTitle><Shield className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{counts.total}</div><p className="text-xs text-muted-foreground">Detected issues</p></CardContent></Card>
        <Card className="border-l-4 border-l-red-500"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">High Risk</CardTitle><AlertTriangle className="size-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{counts.high}</div><p className="text-xs text-muted-foreground">Requires immediate action</p></CardContent></Card>
        <Card className="border-l-4 border-l-amber-500"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Medium Risk</CardTitle><Info className="size-4 text-amber-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{counts.medium}</div><p className="text-xs text-muted-foreground">Should be addressed</p></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Low Risk</CardTitle><CheckCircle className="size-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{counts.low}</div><p className="text-xs text-muted-foreground">Minor issues</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search vulnerabilities, CVEs, hosts, or services..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-full sm:w-[150px]"><Filter className="mr-2 size-4" /><SelectValue placeholder="Risk Level" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Risks</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="in-progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vulnerability List</CardTitle>
          <CardDescription>{findings.length} vulnerabilit{findings.length !== 1 ? "ies" : "y"} found</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vulnerability</TableHead>
                <TableHead>Affected Host</TableHead>
                <TableHead>Port/Service</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Discovered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {findings.map((vuln) => (
                <TableRow key={vuln.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{vuln.title}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {vuln.cve ? (
                          <a href={vuln.cveUrl ?? `https://nvd.nist.gov/vuln/detail/${vuln.cve}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            {vuln.cve}
                            <ExternalLink className="size-3" />
                          </a>
                        ) : <span className="text-muted-foreground">No mapped CVE</span>}
                        {vuln.referenceUrl ? (
                          <a href={vuln.referenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
                            Reference
                            <ExternalLink className="size-3" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">{vuln.affectedHost}</code>
                      <p className="text-xs text-muted-foreground">{vuln.hostname}</p>
                    </div>
                  </TableCell>
                  <TableCell>{vuln.port}/{vuln.service}</TableCell>
                  <TableCell><RiskBadge level={vuln.riskLevel} /></TableCell>
                  <TableCell>{getStatusBadge(vuln.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDateTime(vuln.discoveredAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedVuln(vuln)}>
                        <Wrench className="mr-2 size-4" />
                        Remediate
                      </Button>
                      {canDelete ? (
                        <Button variant="destructive" size="sm" onClick={async () => { if (!window.confirm(`Are you sure you want to delete the finding "${vuln.title}"?`)) return; await deleteFinding(vuln.id); await loadData() }}>
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedVuln} onOpenChange={() => setSelectedVuln(null)}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wrench className="size-5" />Remediation Steps</DialogTitle>
            <DialogDescription>Follow these steps to investigate and resolve the vulnerability</DialogDescription>
          </DialogHeader>
          {selectedVuln ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{selectedVuln.title}</h3><RiskBadge level={selectedVuln.riskLevel} /></div>
                <p className="mb-3 text-sm text-muted-foreground">{selectedVuln.description}</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <span><strong>Host:</strong> {selectedVuln.hostname} ({selectedVuln.affectedHost})</span>
                  <span><strong>Port / Service:</strong> {selectedVuln.port} / {selectedVuln.service}</span>
                  <span><strong>Status:</strong> {selectedVuln.status}</span>
                  <span><strong>Discovered:</strong> {formatDateTime(selectedVuln.discoveredAt)}</span>
                </div>
                {selectedVuln.cve ? (
                  <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm">
                    <p className="font-medium">Mapped CVE</p>
                    <a href={selectedVuln.cveUrl ?? `https://nvd.nist.gov/vuln/detail/${selectedVuln.cve}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-primary hover:underline">
                      {selectedVuln.cve}
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <h4 className="mb-2 font-semibold text-primary">Recommended Action</h4>
                <p className="text-sm">{selectedVuln.recommendation}</p>
                <div className="mt-3 text-xs text-muted-foreground">
                  <span className="font-medium">Source:</span>{" "}
                  {selectedVuln.referenceUrl ? (
                    <a href={selectedVuln.referenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground hover:underline">
                      {selectedVuln.source}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : selectedVuln.source}
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedVuln(null)}>Close</Button>
            <Button onClick={async () => {
              if (!selectedVuln) return
              await updateFinding(selectedVuln.id, selectedVuln.status === "open" ? "in-progress" : "resolved")
              setSelectedVuln(null)
              await loadData()
            }}>
              {selectedVuln?.status === "open" ? "Mark as In Progress" : "Mark as Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
