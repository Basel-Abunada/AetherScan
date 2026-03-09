"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Server, Wifi, WifiOff, RefreshCw, Plus, Pencil, Trash2, Radar } from "lucide-react"
import type { Agent, ScanResult } from "@/lib/aetherscan/types"
import { deleteAgent, fetchAgents, fetchScans, formatDateTime, registerAgent, timeAgo, updateAgent } from "@/lib/aetherscan-client"

type AgentForm = {
  name: string
  hostname: string
  ipAddress: string
  platform: string
  description: string
  mode: string
  targetHint: string
}

const emptyForm: AgentForm = {
  name: "",
  hostname: "",
  ipAddress: "",
  platform: "Kali Linux",
  description: "",
  mode: "live",
  targetHint: "",
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [scans, setScans] = useState<ScanResult[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [createdAgent, setCreatedAgent] = useState<(Agent & { authToken?: string }) | null>(null)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [form, setForm] = useState<AgentForm>(emptyForm)
  const [editForm, setEditForm] = useState<AgentForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const loadData = async () => {
    setError("")
    try {
      const [agentsData, scansData] = await Promise.all([fetchAgents(), fetchScans()])
      setAgents(agentsData)
      setScans(scansData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents")
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const onlineCount = agents.filter((agent) => agent.status === "online").length
  const occupiedCount = agents.filter((agent) => agent.status === "occupied").length
  const offlineCount = agents.filter((agent) => agent.status === "offline").length
  const statsByAgent = useMemo(
    () => Object.fromEntries(agents.map((agent) => [agent.id, scans.filter((scan) => scan.agentId === agent.id)])),
    [agents, scans],
  )

  const agentLaunchCommand = createdAgent?.authToken
    ? `export AETHERSCAN_SERVER_URL="http://YOUR_SERVER_IP:3000"\nexport AETHERSCAN_AGENT_TOKEN="${createdAgent.authToken}"\nexport AETHERSCAN_ONCE=false\nnode ./scripts/aetherscan-agent.mjs`
    : ""

  const badgeClassName = (status: Agent["status"]) => {
    if (status === "online") return "border-green-200 bg-green-100 text-green-700"
    if (status === "occupied") return "border-blue-200 bg-blue-100 text-blue-700"
    if (status === "degraded") return "border-amber-200 bg-amber-100 text-amber-700"
    return ""
  }

  const iconClassName = (status: Agent["status"]) => {
    if (status === "online") return "bg-green-100 text-green-600"
    if (status === "occupied") return "bg-blue-100 text-blue-600"
    if (status === "degraded") return "bg-amber-100 text-amber-600"
    return "bg-muted text-muted-foreground"
  }

  const openEditDialog = (agent: Agent) => {
    setEditingAgent(agent)
    setEditForm({
      name: agent.name,
      hostname: agent.hostname,
      ipAddress: agent.ipAddress,
      platform: agent.platform,
      description: agent.description ?? "",
      mode: agent.mode,
      targetHint: agent.targetHint ?? "",
    })
    setIsEditDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scanning Agents</h1>
          <p className="text-muted-foreground">Register agents, monitor status, and track real scan activity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadData()}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open)
              if (!open) setCreatedAgent(null)
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Add Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Register Agent</DialogTitle>
                <DialogDescription>Create a real agent record and use the generated token on the agent host</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Kali Scanner 01" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hostname</Label>
                    <Input value={form.hostname} onChange={(event) => setForm((current) => ({ ...current, hostname: event.target.value }))} placeholder="kali-agent" />
                  </div>
                  <div className="space-y-2">
                    <Label>IP Address</Label>
                    <Input value={form.ipAddress} onChange={(event) => setForm((current) => ({ ...current, ipAddress: event.target.value }))} placeholder="192.168.1.60" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Input value={form.platform} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Scanning host in the internal network" />
                </div>
                <div className="space-y-2">
                  <Label>Default Target Hint</Label>
                  <Input value={form.targetHint} onChange={(event) => setForm((current) => ({ ...current, targetHint: event.target.value }))} placeholder="e.g. 192.168.1.0/24" />
                </div>
                {createdAgent?.authToken ? (
                  <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                    <p className="mb-2 font-medium">Agent token</p>
                    <code className="block break-all">{createdAgent.authToken}</code>
                    <p className="mb-2 mt-3 font-medium">Run command on the agent host</p>
                    <code className="block whitespace-pre-wrap break-all">{agentLaunchCommand}</code>
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Close
                </Button>
                <Button
                  disabled={submitting || !form.name || !form.hostname || !form.ipAddress}
                  onClick={async () => {
                    setSubmitting(true)
                    setError("")
                    try {
                      const agent = await registerAgent(form)
                      setCreatedAgent(agent)
                      await loadData()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to register agent")
                    } finally {
                      setSubmitting(false)
                    }
                  }}
                >
                  Register Agent
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
            <DialogDescription>Update the selected agent details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hostname</Label>
                <Input value={editForm.hostname} onChange={(event) => setEditForm((current) => ({ ...current, hostname: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>IP Address</Label>
                <Input value={editForm.ipAddress} onChange={(event) => setEditForm((current) => ({ ...current, ipAddress: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Input value={editForm.platform} onChange={(event) => setEditForm((current) => ({ ...current, platform: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Default Target Hint</Label>
              <Input value={editForm.targetHint} onChange={(event) => setEditForm((current) => ({ ...current, targetHint: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={submitting || !editingAgent || !editForm.name || !editForm.hostname || !editForm.ipAddress}
              onClick={async () => {
                if (!editingAgent) return
                setSubmitting(true)
                setError("")
                try {
                  await updateAgent(editingAgent.id, editForm)
                  setIsEditDialogOpen(false)
                  setEditingAgent(null)
                  await loadData()
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to update agent")
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Agents</CardTitle>
            <Server className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
            <p className="text-xs text-muted-foreground">Registered agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Online</CardTitle>
            <Wifi className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{onlineCount}</div>
            <p className="text-xs text-muted-foreground">Ready for polling</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Occupied</CardTitle>
            <Radar className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{occupiedCount}</div>
            <p className="text-xs text-muted-foreground">Currently running scans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Offline</CardTitle>
            <WifiOff className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offlineCount}</div>
            <p className="text-xs text-muted-foreground">No recent heartbeat</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {agents.length ? agents.map((agent) => {
          const agentScans = statsByAgent[agent.id] ?? []
          const lastScan = agentScans[0]

          return (
            <Card key={agent.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-md p-2 ${iconClassName(agent.status)}`}>
                      <Server className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <CardDescription>{agent.platform} | {agent.hostname}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(agent)}>
                      <Pencil className="mr-2 size-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        setError("")
                        try {
                          if (!window.confirm(`Are you sure you want to delete the agent "${agent.name}"?`)) return
                          await deleteAgent(agent.id)
                          if (editingAgent?.id === agent.id) {
                            setEditingAgent(null)
                            setIsEditDialogOpen(false)
                          }
                          await loadData()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Failed to delete agent")
                        }
                      }}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className={badgeClassName(agent.status)}>
                      {agent.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">IP Address</span>
                    <code className="rounded bg-muted px-2 py-0.5 text-xs">{agent.ipAddress}</code>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Seen</span>
                    <span>{timeAgo(agent.lastSeenAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Queued/Completed Scans</span>
                    <span className="font-medium">{agentScans.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Scan</span>
                    <span className="text-muted-foreground">{lastScan ? formatDateTime(lastScan.completedAt ?? lastScan.startedAt) : "Never"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Target Hint</span>
                    <span className="text-muted-foreground">{agent.targetHint || "Not set"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        }) : (
          <Card className="md:col-span-2">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No agents registered yet. Register an agent, then start the agent process on the target host.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


