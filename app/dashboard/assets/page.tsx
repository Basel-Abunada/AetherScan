"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Filter, Monitor, Laptop, Server, Printer, Smartphone, Router, Eye } from "lucide-react"
import { RiskBadge } from "@/components/risk-badge"
import type { Asset } from "@/lib/aetherscan/types"
import { fetchAssets, fetchVulnerabilities, formatDateTime } from "@/lib/aetherscan-client"

type DeviceType = "server" | "workstation" | "laptop" | "printer" | "router" | "mobile" | "unknown"
type AssetView = Asset & { deviceType: DeviceType; vulnerabilities: { high: number; medium: number; low: number } }

const deviceIcons: Record<DeviceType, React.ComponentType<{ className?: string }>> = {
  server: Server,
  workstation: Monitor,
  laptop: Laptop,
  printer: Printer,
  router: Router,
  mobile: Smartphone,
  unknown: Monitor,
}

function inferDeviceType(asset: Asset): DeviceType {
  const fingerprint = `${asset.hostname} ${asset.os ?? ""}`.toLowerCase()
  if (fingerprint.includes("router") || fingerprint.includes("gateway")) return "router"
  if (fingerprint.includes("printer")) return "printer"
  if (fingerprint.includes("server")) return "server"
  if (fingerprint.includes("ubuntu") || fingerprint.includes("debian") || fingerprint.includes("centos")) return "server"
  if (fingerprint.includes("macbook") || fingerprint.includes("laptop")) return "laptop"
  if (fingerprint.includes("windows")) return "workstation"
  return "unknown"
}

export default function AssetsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedAsset, setSelectedAsset] = useState<AssetView | null>(null)
  const [assets, setAssets] = useState<AssetView[]>([])

  useEffect(() => {
    Promise.all([fetchAssets(), fetchVulnerabilities()]).then(([assetsData, findingsData]) => {
      const counts = findingsData.findings.reduce<Record<string, { high: number; medium: number; low: number }>>((acc, finding) => {
        acc[finding.assetId] ??= { high: 0, medium: 0, low: 0 }
        acc[finding.assetId][finding.riskLevel] += 1
        return acc
      }, {})
      setAssets(assetsData.map((asset) => ({ ...asset, deviceType: inferDeviceType(asset), vulnerabilities: counts[asset.id] ?? { high: 0, medium: 0, low: 0 } })))
    })
  }, [])

  const filteredAssets = useMemo(() => assets.filter((asset) => {
    const matchesSearch = asset.hostname.toLowerCase().includes(searchTerm.toLowerCase()) || asset.ipAddress.includes(searchTerm) || (asset.os ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || asset.deviceType === typeFilter
    return matchesSearch && matchesType
  }), [assets, searchTerm, typeFilter])

  const totalVulnerabilities = assets.reduce((acc, asset) => acc + asset.vulnerabilities.high + asset.vulnerabilities.medium + asset.vulnerabilities.low, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight">Network Assets</h1><p className="text-muted-foreground">Discovered devices and their security status</p></div></div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle><Monitor className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{assets.length}</div><p className="text-xs text-muted-foreground">Discovered devices</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Servers</CardTitle><Server className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{assets.filter((a) => a.deviceType === "server").length}</div><p className="text-xs text-muted-foreground">Server devices</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Workstations</CardTitle><Laptop className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{assets.filter((a) => ["workstation", "laptop"].includes(a.deviceType)).length}</div><p className="text-xs text-muted-foreground">User devices</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Vulnerabilities</CardTitle><Monitor className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalVulnerabilities}</div><p className="text-xs text-muted-foreground">Across all assets</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search by hostname, IP, or OS..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-full sm:w-[180px]"><Filter className="mr-2 size-4" /><SelectValue placeholder="Device Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="server">Servers</SelectItem><SelectItem value="workstation">Workstations</SelectItem><SelectItem value="laptop">Laptops</SelectItem><SelectItem value="router">Routers</SelectItem><SelectItem value="printer">Printers</SelectItem></SelectContent></Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Discovered Assets</CardTitle><CardDescription>{filteredAssets.length} asset{filteredAssets.length !== 1 && "s"} found</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Device</TableHead><TableHead>IP Address</TableHead><TableHead>Operating System</TableHead><TableHead className="text-center">Open Ports</TableHead><TableHead className="text-center">Vulnerabilities</TableHead><TableHead>Last Seen</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => {
                const DeviceIcon = deviceIcons[asset.deviceType]
                const totalVulns = asset.vulnerabilities.high + asset.vulnerabilities.medium + asset.vulnerabilities.low
                const riskLevel = asset.vulnerabilities.high > 0 ? "high" : asset.vulnerabilities.medium > 0 ? "medium" : "low"
                return (
                  <TableRow key={asset.id}>
                    <TableCell><div className="flex items-center gap-3"><div className="rounded-md bg-muted p-2"><DeviceIcon className="size-4" /></div><div><p className="font-medium">{asset.hostname}</p><p className="text-xs text-muted-foreground capitalize">{asset.deviceType}</p></div></div></TableCell>
                    <TableCell><code className="bg-muted px-2 py-0.5 rounded text-xs">{asset.ipAddress}</code></TableCell>
                    <TableCell className="max-w-[200px] truncate">{asset.os ?? "Unknown"}</TableCell>
                    <TableCell className="text-center"><Badge variant="secondary">{asset.services.length}</Badge></TableCell>
                    <TableCell className="text-center">{totalVulns > 0 ? <div className="flex items-center justify-center gap-1"><RiskBadge level={riskLevel} /><span className="text-sm">({totalVulns})</span></div> : <span className="text-sm text-muted-foreground">None</span>}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDateTime(asset.lastSeenAt)}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setSelectedAsset(asset)}><Eye className="mr-2 size-4" />Details</Button></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Asset Details</DialogTitle><DialogDescription>Complete information about the selected asset</DialogDescription></DialogHeader>
          {selectedAsset ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground mb-1">Hostname</p><p className="font-medium">{selectedAsset.hostname}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground mb-1">IP Address</p><code className="text-sm">{selectedAsset.ipAddress}</code></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground mb-1">Device Type</p><p className="font-medium capitalize">{selectedAsset.deviceType}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground mb-1">Status</p><p className="font-medium">{selectedAsset.status}</p></div>
                <div className="rounded-lg border p-3 col-span-2"><p className="text-xs text-muted-foreground mb-1">Operating System</p><p className="font-medium">{selectedAsset.os ?? "Unknown"}</p></div>
              </div>
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground mb-2">Open Ports & Services</p><div className="flex flex-wrap gap-2">{selectedAsset.services.map((service) => <Badge key={`${selectedAsset.id}-${service.port}`} variant="outline">{service.port} ({service.name})</Badge>)}</div></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground mb-2">Vulnerabilities</p><div className="flex gap-4"><div className="text-center"><span className="inline-flex items-center justify-center size-8 rounded-full bg-red-100 text-red-700 font-medium">{selectedAsset.vulnerabilities.high}</span><p className="text-xs text-muted-foreground mt-1">High</p></div><div className="text-center"><span className="inline-flex items-center justify-center size-8 rounded-full bg-amber-100 text-amber-700 font-medium">{selectedAsset.vulnerabilities.medium}</span><p className="text-xs text-muted-foreground mt-1">Medium</p></div><div className="text-center"><span className="inline-flex items-center justify-center size-8 rounded-full bg-green-100 text-green-700 font-medium">{selectedAsset.vulnerabilities.low}</span><p className="text-xs text-muted-foreground mt-1">Low</p></div></div></div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
