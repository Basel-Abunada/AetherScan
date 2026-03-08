"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Server, Wifi, WifiOff } from "lucide-react"
import type { Agent } from "@/lib/aetherscan/types"
import { timeAgo } from "@/lib/aetherscan-client"

interface AgentsStatusProps {
  agents: Agent[]
}

export function AgentsStatus({ agents }: AgentsStatusProps) {
  const onlineCount = agents.filter((agent) => agent.status === "online").length
  const offlineCount = agents.filter((agent) => agent.status !== "online").length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Agents Status</CardTitle>
            <CardDescription>Active scanning agents</CardDescription>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <Wifi className="size-4" /> {onlineCount} Online
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
                <div className={`rounded-md p-2 ${agent.status === "online" ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
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
                <Badge
                  variant={agent.status === "online" ? "secondary" : "outline"}
                  className={agent.status === "online" ? "bg-green-100 text-green-700 border-green-200" : ""}
                >
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
