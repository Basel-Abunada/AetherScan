"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Toaster } from "@/components/ui/sonner"
import { NotificationCenter } from "@/components/notification-center"
import { fetchDashboard, loadSession, type ClientSession } from "@/lib/aetherscan-client"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/scans": "Scan Schedules",
  "/dashboard/results": "Scan Results",
  "/dashboard/assets": "Network Assets",
  "/dashboard/vulnerabilities": "Vulnerabilities",
  "/dashboard/agents": "Agents",
  "/dashboard/reports": "Reports",
  "/dashboard/users": "User Management",
  "/dashboard/settings": "Settings",
  "/dashboard/help": "Help & Support",
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const currentPageTitle = pageTitles[pathname] || "Dashboard"
  const [session, setSession] = useState<ClientSession | null>(null)
  const [ready, setReady] = useState(false)
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    const current = loadSession()
    if (!current) {
      router.replace("/login")
      return
    }
    setSession(current)
    setReady(true)
  }, [router])

  useEffect(() => {
    if (!session) return

    let cancelled = false
    const loadAlerts = async () => {
      try {
        const data = await fetchDashboard()
        if (!cancelled) setAlertCount(data.alerts.length)
      } catch {
        if (!cancelled) setAlertCount(0)
      }
    }

    void loadAlerts()
    const interval = window.setInterval(() => {
      void loadAlerts()
    }, 15000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [session])

  if (!ready || !session) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading dashboard...</div>
  }

  return (
    <SidebarProvider>
      <AppSidebar userRole={session.user.role} userName={session.user.name} alertCount={alertCount} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">AetherScan</BreadcrumbLink>
              </BreadcrumbItem>
              {pathname !== "/dashboard" && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{currentPageTitle}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        <NotificationCenter />
        <Toaster richColors closeButton position="top-right" />
      </SidebarInset>
    </SidebarProvider>
  )
}
