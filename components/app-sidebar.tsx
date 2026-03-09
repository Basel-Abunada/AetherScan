"use client"

import {
  LayoutDashboard,
  Scan,
  Calendar,
  Shield,
  Monitor,
  FileText,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Server,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { clearSession } from "@/lib/aetherscan-client"

const mainNavItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Scan Schedules", href: "/dashboard/scans", icon: Calendar, roles: ["admin", "engineer"] },
  { title: "Scan Results", href: "/dashboard/results", icon: Scan },
  { title: "Network Assets", href: "/dashboard/assets", icon: Monitor },
  { title: "Vulnerabilities", href: "/dashboard/vulnerabilities", icon: Shield },
  { title: "Agents", href: "/dashboard/agents", icon: Server, roles: ["admin", "engineer"] },
] as const

const secondaryNavItems = [
  { title: "Reports", href: "/dashboard/reports", icon: FileText },
  { title: "User Management", href: "/dashboard/users", icon: Users, roles: ["admin"] },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
  { title: "Help & Support", href: "/dashboard/help", icon: HelpCircle },
] as const

interface AppSidebarProps {
  userRole?: "admin" | "engineer" | "technician"
  userName?: string
}

export function AppSidebar({ userRole = "admin", userName = "Basel Abunada" }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const allowed = (roles?: readonly string[]) => !roles || roles.includes(userRole)
  const filteredMainItems = mainNavItems.filter((item) => allowed(item.roles))
  const filteredSecondaryItems = secondaryNavItems.filter((item) => allowed(item.roles))

  const getRoleBadge = () => {
    switch (userRole) {
      case "admin":
        return "Administrator"
      case "engineer":
        return "Network Engineer"
      case "technician":
        return "Technician"
      default:
        return "User"
    }
  }

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Image src="/aetherscan-mark.svg" alt="AetherScan logo" width={32} height={32} className="size-8" priority />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">AetherScan</span>
                  <span className="text-xs text-sidebar-foreground/70">Network Scanner</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMainItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredSecondaryItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">{getInitials(userName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-medium">{userName}</span>
                    <span className="text-xs text-sidebar-foreground/70">{getRoleBadge()}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-dropdown-menu-trigger-width]">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => { clearSession(); router.push("/login") }}>
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
