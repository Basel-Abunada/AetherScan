"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { fetchDashboard } from "@/lib/aetherscan-client"

const POLL_INTERVAL_MS = 5000

export function NotificationCenter() {
  const seenAlertIds = useRef<Set<string>>(new Set())
  const initialized = useRef(false)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const data = await fetchDashboard()
        if (cancelled) return

        const latestAlerts = [...data.alerts].reverse()
        if (!initialized.current) {
          for (const alert of latestAlerts) seenAlertIds.current.add(alert.id)
          initialized.current = true
          return
        }

        for (const alert of latestAlerts) {
          if (seenAlertIds.current.has(alert.id)) continue
          seenAlertIds.current.add(alert.id)

          if (alert.category === "scan-completed") {
            toast.success("Scan completed. Please check the results.", {
              description: alert.message,
              duration: 10000,
              action: {
                label: "View results",
                onClick: () => window.location.assign("/dashboard/results"),
              },
            })
            continue
          }

          const options = {
            description: alert.message,
            duration: alert.severity === "high" ? 12000 : 7000,
          }

          if (alert.severity === "high") toast.error(alert.title, options)
          else if (alert.severity === "medium") toast.warning(alert.title, options)
          else toast(alert.title, options)
        }
      } catch {
        // Silent failure keeps the dashboard usable even if polling temporarily fails.
      }
    }

    void poll()
    const interval = window.setInterval(() => {
      void poll()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return null
}
