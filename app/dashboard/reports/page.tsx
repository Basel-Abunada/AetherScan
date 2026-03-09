"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileText, Download, Plus, Calendar, Trash2, FileSpreadsheet, File } from "lucide-react"
import { deleteReport, downloadReport, fetchReports, formatDateTime, loadSession } from "@/lib/aetherscan-client"

type Report = Awaited<ReturnType<typeof fetchReports>>[number]

const typeConfig: Record<string, { label: string; color: string }> = {
  scan: { label: "Scan Report", color: "bg-blue-100 text-blue-700 border-blue-200" },
  vulnerability: { label: "Vulnerability", color: "bg-red-100 text-red-700 border-red-200" },
  asset: { label: "Asset Report", color: "bg-green-100 text-green-700 border-green-200" },
  executive: { label: "Executive", color: "bg-purple-100 text-purple-700 border-purple-200" },
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [type, setType] = useState("executive")
  const [format, setFormat] = useState<"pdf" | "csv">("pdf")
  const role = loadSession()?.user.role
  const canDelete = role === "admin"

  const loadReports = async () => setReports(await fetchReports())
  useEffect(() => { void loadReports() }, [])

  const generate = async (reportType: string, reportFormat: "pdf" | "csv") => {
    await downloadReport({ type: reportType, format: reportFormat, generatedBy: loadSession()?.user.name ?? "Dashboard User" })
    await loadReports()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate and download security reports</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />Generate Report</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>Generate New Report</DialogTitle><DialogDescription>Create a custom security report based on your requirements</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Report Type</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="executive">Executive Summary</SelectItem><SelectItem value="scan">Scan Results Report</SelectItem><SelectItem value="vulnerability">Vulnerability Report</SelectItem><SelectItem value="asset">Asset Inventory</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Export Format</Label><Select value={format} onValueChange={(value: "pdf" | "csv") => setFormat(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pdf">PDF Document</SelectItem><SelectItem value="csv">CSV Spreadsheet</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button onClick={async () => { await generate(type, format); setIsDialogOpen(false) }}>Generate Report</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle><FileText className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{reports.length}</div><p className="text-xs text-muted-foreground">Generated reports</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle><Calendar className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{reports.length}</div><p className="text-xs text-muted-foreground">Reports generated</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">PDF Reports</CardTitle><File className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{reports.filter((r) => r.format === "pdf").length}</div><p className="text-xs text-muted-foreground">Documents</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">CSV Exports</CardTitle><FileSpreadsheet className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{reports.filter((r) => r.format === "csv").length}</div><p className="text-xs text-muted-foreground">Spreadsheets</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Quick Generate</CardTitle><CardDescription>Generate common reports with one click</CardDescription></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => generate("executive", "pdf")}><FileText className="size-6 mb-2" /><span className="font-medium">Weekly Summary</span><span className="text-xs text-muted-foreground">PDF Report</span></Button>
            <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => generate("vulnerability", "csv")}><FileSpreadsheet className="size-6 mb-2" /><span className="font-medium">Vulnerability Export</span><span className="text-xs text-muted-foreground">CSV Export</span></Button>
            <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => generate("asset", "csv")}><FileSpreadsheet className="size-6 mb-2" /><span className="font-medium">Asset Inventory</span><span className="text-xs text-muted-foreground">CSV Export</span></Button>
            <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => generate("scan", "pdf")}><FileText className="size-6 mb-2" /><span className="font-medium">Latest Scan Report</span><span className="text-xs text-muted-foreground">PDF Report</span></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Generated Reports</CardTitle><CardDescription>View generated report metadata</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Report Name</TableHead><TableHead>Type</TableHead><TableHead>Format</TableHead><TableHead>Generated</TableHead><TableHead>By</TableHead><TableHead>Size</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.name}</TableCell>
                  <TableCell><Badge variant="outline" className={typeConfig[report.type].color}>{typeConfig[report.type].label}</Badge></TableCell>
                  <TableCell><div className="flex items-center gap-2">{report.format === "pdf" ? <File className="size-4 text-red-500" /> : <FileSpreadsheet className="size-4 text-green-500" />}{report.format.toUpperCase()}</div></TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(report.generatedAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{report.generatedBy}</TableCell>
                  <TableCell className="text-muted-foreground">{Math.max(1, Math.round(report.sizeBytes / 1024))} KB</TableCell>
                  <TableCell className="text-right"><div className="flex items-center justify-end gap-2"><Button variant="ghost" size="icon" className="size-8" onClick={() => generate(report.type, report.format)}><Download className="size-4" /></Button>{canDelete ? <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={async () => { if (!window.confirm(`Are you sure you want to delete the report \"${report.name}\"?`)) return; await deleteReport(report.id); await loadReports() }}><Trash2 className="size-4" /></Button> : null}</div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
