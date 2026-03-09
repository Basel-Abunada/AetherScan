"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Server, Wifi, WifiOff, Radar } from "lucide-react"
import type { Agent } from "@/lib/aetherscan/types"
import { timeAgo } from "@/lib/aetherscan-client"

interface AgentsStatusProps {
  agents: Agent[]
}

export function AgentsStatus({ agents }: AgentsStatusProps) {
  const onlineCount = agents.filter((agent) => agent.status === "online").length
  const occupiedCount = agents.filter((agent) => agent.status === "occupied").length
  const offlineCount = agents.filter((agent) => agent.status === "offline").length

  const badgeClassName = (status: Agent["status"]) => {
    if (status === "online") return "bg-green-100 text-green-700 border-green-200"
    if (status === "occupied") return "bg-blue-100 text-blue-700 border-blue-200"
    if (status === "degraded") return "bg-amber-100 text-amber-700 border-amber-200"
    return ""
  }

  const iconClassName = (status: Agent["status"]) => {
    if (status === "online") return "bg-green-100 text-green-600"
    if (status === "occupied") return "bg-blue-100 text-blue-600"
    if (status === "degraded") return "bg-amber-100 text-amber-600"
    return "bg-muted text-muted-foreground"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Agents Status</CardTitle>
            <CardDescription>Active scanning agents</CardDescription>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <Wifi className="size-4" /> {onlineCount} Online
            </span>
            <span className="flex items-center gap-1 text-blue-600">
              <Radar className="size-4" /> {occupiedCount} Occupied
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <WifiOff className="size-4" /> {offlineCount} Offline
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {agents.length ? agents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div className={`rounded-md p-2 ${iconClassName(agent.status)}`}>
                  <Server className="size-4" />
                </div>
                <div>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {agent.platform} | {agent.ipAddress}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{timeAgo(agent.lastSeenAt)}</span>
                <Badge variant="outline" className={badgeClassName(agent.status)}>
                  {agent.status}
                </Badge>
              </div>
            </div>
          )) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No agents found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
