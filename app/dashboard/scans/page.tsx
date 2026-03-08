"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Play, Pause, MoreHorizontal, Trash2, Calendar, Clock, Server } from "lucide-react"
import type { Agent, ScanSchedule } from "@/lib/aetherscan/types"
import { createSchedule, deleteSchedule, fetchAgents, fetchSchedules, formatDateTime, runScan, updateSchedule } from "@/lib/aetherscan-client"

export default function ScanSchedulesPage() {
  const [schedules, setSchedules] = useState<ScanSchedule[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ name: "", agentId: "", frequency: "Daily", startTime: "02:00", scanType: "full", target: "", mode: "live" })
  const [runForm, setRunForm] = useState({ agentId: "", target: "", scanType: "standard", mode: "live" })

  const loadData = async () => {
    setLoading(true)
    setError("")
    try {
      const [schedulesData, agentsData] = await Promise.all([fetchSchedules(), fetchAgents()])
      setSchedules(schedulesData)
      setAgents(agentsData)
      setForm((current) => ({ ...current, agentId: current.agentId || agentsData[0]?.id || "" }))
      setRunForm((current) => ({ ...current, agentId: current.agentId || agentsData[0]?.id || "" }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedules")
    } finally { setLoading(false) }
  }

  useEffect(() => { void loadData() }, [])

  const activeSchedules = schedules.filter((schedule) => schedule.status === "active").length
  const nextSchedule = schedules.filter((schedule) => schedule.status === "active").sort((l, r) => new Date(l.nextRunAt).getTime() - new Date(r.nextRunAt).getTime())[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Scan Schedules</h1><p className="text-muted-foreground">Queue on-demand scans and manage recurring scan schedules</p></div>
        <div className="flex gap-2">
          <Dialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen}><DialogTrigger asChild><Button variant="outline"><Play className="mr-2 size-4" />Queue Scan</Button></DialogTrigger><DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle>Queue On-Demand Scan</DialogTitle><DialogDescription>The selected agent will execute this scan when it polls the server</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><div className="space-y-2"><Label>Scanning Agent</Label><Select value={runForm.agentId} onValueChange={(value) => setRunForm((c) => ({ ...c, agentId: value }))}><SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger><SelectContent>{agents.map((agent) => <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Target</Label><Input value={runForm.target} onChange={(event) => setRunForm((c) => ({ ...c, target: event.target.value }))} placeholder="e.g. 192.168.1.0/24" /></div><div className="space-y-2"><Label>Scan Type</Label><Select value={runForm.scanType} onValueChange={(value) => setRunForm((c) => ({ ...c, scanType: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="quick">Quick Scan</SelectItem><SelectItem value="standard">Standard Scan</SelectItem><SelectItem value="full">Full Scan</SelectItem><SelectItem value="vuln">Vulnerability Scan</SelectItem></SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setIsRunDialogOpen(false)}>Cancel</Button><Button disabled={submitting || !runForm.agentId || !runForm.target} onClick={async () => { setSubmitting(true); try { await runScan(runForm); setIsRunDialogOpen(false); await loadData() } finally { setSubmitting(false) } }}>Queue Scan</Button></DialogFooter></DialogContent></Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogTrigger asChild><Button><Plus className="mr-2 size-4" />New Schedule</Button></DialogTrigger><DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle>Create Scan Schedule</DialogTitle><DialogDescription>Create a recurring scan job for a registered agent</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><div className="space-y-2"><Label>Schedule Name</Label><Input value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} placeholder="e.g. Weekly Internal Scan" /></div><div className="space-y-2"><Label>Scanning Agent</Label><Select value={form.agentId} onValueChange={(value) => setForm((c) => ({ ...c, agentId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{agents.map((agent) => <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Target</Label><Input value={form.target} onChange={(event) => setForm((c) => ({ ...c, target: event.target.value }))} placeholder="e.g. 192.168.1.0/24" /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Frequency</Label><Select value={form.frequency} onValueChange={(value) => setForm((c) => ({ ...c, frequency: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Hourly">Hourly</SelectItem><SelectItem value="Every 6 hours">Every 6 hours</SelectItem><SelectItem value="Daily">Daily</SelectItem><SelectItem value="Weekly">Weekly</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={(event) => setForm((c) => ({ ...c, startTime: event.target.value }))} /></div></div><div className="space-y-2"><Label>Scan Type</Label><Select value={form.scanType} onValueChange={(value) => setForm((c) => ({ ...c, scanType: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="quick">Quick Scan</SelectItem><SelectItem value="standard">Standard Scan</SelectItem><SelectItem value="full">Full Scan</SelectItem><SelectItem value="vuln">Vulnerability Scan</SelectItem></SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button disabled={submitting || !form.name || !form.agentId || !form.target} onClick={async () => { setSubmitting(true); try { await createSchedule(form); setIsDialogOpen(false); setForm((c) => ({ ...c, name: "", target: "" })); await loadData() } finally { setSubmitting(false) } }}>Create Schedule</Button></DialogFooter></DialogContent></Dialog>
        </div>
      </div>
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      <div className="grid gap-4 sm:grid-cols-3"><Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Schedules</CardTitle><Calendar className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{loading ? "..." : activeSchedules}</div><p className="text-xs text-muted-foreground">Currently enabled</p></CardContent></Card><Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Next Scheduled Run</CardTitle><Clock className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-sm font-semibold">{nextSchedule ? formatDateTime(nextSchedule.nextRunAt) : "No active schedule"}</div><p className="text-xs text-muted-foreground">{nextSchedule?.name ?? "Create a schedule to begin"}</p></CardContent></Card><Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Registered Agents</CardTitle><Server className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{agents.length}</div><p className="text-xs text-muted-foreground">Available for execution</p></CardContent></Card></div>
      <Card><CardHeader><CardTitle>Scheduled Scans</CardTitle><CardDescription>Agent jobs will be executed when an agent polls the server</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Schedule Name</TableHead><TableHead>Agent</TableHead><TableHead>Frequency</TableHead><TableHead>Target</TableHead><TableHead>Next Run</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{schedules.map((schedule) => { const agent = agents.find((entry) => entry.id === schedule.agentId); return <TableRow key={schedule.id}><TableCell className="font-medium">{schedule.name}</TableCell><TableCell>{agent?.name ?? schedule.agentId}</TableCell><TableCell>{schedule.frequency}</TableCell><TableCell>{schedule.target}</TableCell><TableCell className="text-muted-foreground">{formatDateTime(schedule.nextRunAt)}</TableCell><TableCell><Badge variant={schedule.status === "active" ? "secondary" : "outline"} className={schedule.status === "active" ? "bg-green-100 text-green-700 border-green-200" : ""}>{schedule.status}</Badge></TableCell><TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /><span className="sr-only">Actions</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={async () => { await runScan({ agentId: schedule.agentId, target: schedule.target, scanType: schedule.scanType, mode: "live" }); await loadData() }}><Play className="mr-2 size-4" />Queue Now</DropdownMenuItem><DropdownMenuItem onClick={async () => { await updateSchedule(schedule.id, { status: schedule.status === "active" ? "paused" : "active" }); await loadData() }}>{schedule.status === "active" ? <Pause className="mr-2 size-4" /> : <Play className="mr-2 size-4" />}{schedule.status === "active" ? "Pause" : "Resume"}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={async () => { await deleteSchedule(schedule.id); await loadData() }}><Trash2 className="mr-2 size-4" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow> })}</TableBody></Table></CardContent></Card>
    </div>
  )
}
