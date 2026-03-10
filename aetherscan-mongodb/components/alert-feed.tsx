"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, Bell, CheckCircle2, ChevronRight, Clock, ShieldAlert, WifiOff } from "lucide-react"
import Link from "next/link"
import type { Alert } from "@/lib/aetherscan/types"
import { timeAgo } from "@/lib/aetherscan-client"

interface AlertFeedProps {
  alerts: Alert[]
}

function alertVisual(alert: Alert) {
  if (alert.category === "scan-completed") {
    return {
      icon: CheckCircle2,
      iconClass: "text-green-500",
      badgeClass: "bg-green-100 text-green-700 border-green-200",
      borderClass: "border-l-green-500",
      label: "completed",
    }
  }

  if (alert.title.toLowerCase().startsWith("agent offline:")) {
    return {
      icon: WifiOff,
      iconClass: "text-amber-500",
      badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
      borderClass: "border-l-amber-500",
      label: "agent",
    }
  }

  if (alert.severity === "high") {
    return {
      icon: ShieldAlert,
      iconClass: "text-red-500",
      badgeClass: "bg-red-100 text-red-700 border-red-200",
      borderClass: "border-l-red-500",
      label: "high",
    }
  }

  if (alert.severity === "medium") {
    return {
      icon: AlertTriangle,
      iconClass: "text-amber-500",
      badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
      borderClass: "border-l-amber-500",
      label: "medium",
    }
  }

  return {
    icon: Bell,
    iconClass: "text-blue-500",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    borderClass: "border-l-blue-500",
    label: "info",
  }
}

export function AlertFeed({ alerts }: AlertFeedProps) {
  const visibleAlerts = alerts.slice(0, 8)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-5" />
          Alert Feed
        </CardTitle>
        <CardDescription>Real-time security alerts and scan notifications</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1 p-4 pt-0">
            {visibleAlerts.length ? visibleAlerts.map((alert) => {
              const visual = alertVisual(alert)
              const Icon = visual.icon

              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-lg border-l-4 bg-muted/30 p-3 transition-colors hover:bg-muted/50 ${visual.borderClass}`}
                >
                  <div className={`mt-0.5 ${visual.iconClass}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-medium text-foreground">{alert.title}</span>
                      <Badge variant="outline" className={visual.badgeClass}>
                        {visual.label}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{alert.message}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {timeAgo(alert.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No alerts yet. Queue a scan to start generating notifications.
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-3">
          <Link href="/dashboard/results" className="flex w-full items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
            View Latest Results
            <ChevronRight className="ml-2 size-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
