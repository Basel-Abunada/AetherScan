"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, MoreHorizontal, Search, Download, Filter, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react"
import type { ScanResult } from "@/lib/aetherscan/types"
import { deleteScanResult, downloadReport, fetchScans, formatDateTime, loadSession, scanTypeLabel } from "@/lib/aetherscan-client"

const LIVE_REFRESH_MS = 5000

export default function ScanResultsPage() {
  const [results, setResults] = useState<ScanResult[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [error, setError] = useState("")
  const role = loadSession()?.user.role
  const canDelete = role === "admin"

  const loadResults = async () => {
    try {
      setResults(await fetchScans())
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scans")
    }
  }

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      if (cancelled) return
      await loadResults()
    }

    void refresh()
    const interval = window.setInterval(() => {
      void refresh()
    }, LIVE_REFRESH_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const filteredResults = useMemo(() => results.filter((result) => {
    const matchesSearch = result.agentName.toLowerCase().includes(searchTerm.toLowerCase()) || result.target.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || result.status === statusFilter
    return matchesSearch && matchesStatus
  }), [results, searchTerm, statusFilter])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="size-4 text-green-600" />
      case "running":
        return <Clock className="size-4 text-blue-600" />
      case "failed":
        return <XCircle className="size-4 text-red-600" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scan Results</h1>
          <p className="text-muted-foreground">View and analyze completed network scan results</p>
        </div>
        <Button variant="outline" onClick={() => downloadReport({ type: "scan", format: "csv", generatedBy: "Dashboard User" })}>
          <Download className="mr-2 size-4" />
          Export All Results
        </Button>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by agent name or target..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 size-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Scan Results</CardTitle>
          <CardDescription>{filteredResults.length} scan{filteredResults.length !== 1 && "s"} found</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Scan Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Hosts</TableHead>
                <TableHead className="text-center">High</TableHead>
                <TableHead className="text-center">Medium</TableHead>
                <TableHead className="text-center">Low</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="font-medium">{result.agentName}</TableCell>
                  <TableCell className="text-muted-foreground">{result.target}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(result.completedAt ?? result.startedAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{result.durationSeconds ? `${result.durationSeconds}s` : "N/A"}</TableCell>
                  <TableCell><Badge variant="outline">{scanTypeLabel(result.scanType)}</Badge></TableCell>
                  <TableCell className="text-center">{result.totalHosts}</TableCell>
                  <TableCell className="text-center">{result.vulnerabilities.high}</TableCell>
                  <TableCell className="text-center">{result.vulnerabilities.medium}</TableCell>
                  <TableCell className="text-center">{result.vulnerabilities.low}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className={result.status === "completed" ? "text-green-600" : result.status === "failed" ? "text-red-600" : "text-blue-600"}>{result.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => downloadReport({ type: "scan", format: "pdf", generatedBy: result.agentName })}>
                          <FileText className="mr-2 size-4" />
                          Generate PDF Report
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadReport({ type: "scan", format: "csv", generatedBy: result.agentName })}>
                          <Download className="mr-2 size-4" />
                          Export to CSV
                        </DropdownMenuItem>
                        {canDelete ? (
                          <DropdownMenuItem className="text-destructive" onClick={async () => { if (!window.confirm(`Are you sure you want to delete scan result "${result.id}"?`)) return; await deleteScanResult(result.id); await loadResults() }}>
                            <Trash2 className="mr-2 size-4" />
                            Delete Scan Result
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
