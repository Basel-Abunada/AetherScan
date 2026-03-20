"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Database, Globe, Lock, Mail, Shield, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  applyThemePreference,
  clearSession,
  fetchSessions,
  fetchSettings,
  loadSession,
  readStoredTheme,
  revokeSessions,
  saveSession,
  sendTestEmail,
  updatePassword,
  updateSettings,
  type ThemePreference,
} from "@/lib/aetherscan-client"

type ProfileSettings = {
  name: string
  email: string
  role: string
  department: string
  theme: ThemePreference
  timezone: string
}

type NotificationSettings = {
  emailEnabled: boolean
  highRiskAlerts: boolean
  scanCompletion: boolean
  agentOffline: boolean
  alertEmail: string
  ccEmail: string
}

type EmailSettings = {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  from: string
}

type SystemSettings = {
  defaultScanType: string
  autoGenerateReports: boolean
  dataRetentionDays: number
}

type SessionItem = {
  id: string
  createdAt: string
  expiresAt: string
  lastSeenAt?: string
  userAgent?: string
  ipAddress?: string
  current: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const session = loadSession()
  const isAdmin = session?.user.role === "admin"
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [profile, setProfile] = useState<ProfileSettings>({
    name: "",
    email: "",
    role: "",
    department: "",
    theme: readStoredTheme(),
    timezone: "Asia/Kuala_Lumpur",
  })
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailEnabled: false,
    highRiskAlerts: true,
    scanCompletion: true,
    agentOffline: true,
    alertEmail: "",
    ccEmail: "",
  })
  const [email, setEmail] = useState<EmailSettings>({
    host: "",
    port: 587,
    secure: false,
    username: "",
    password: "",
    from: "",
  })
  const [system, setSystem] = useState<SystemSettings>({
    defaultScanType: "standard",
    autoGenerateReports: true,
    dataRetentionDays: 90,
  })
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const load = async () => {
    try {
      setLoading(true)
      setError("")
      const [settings, sessionData] = await Promise.all([fetchSettings(), fetchSessions()])
      setProfile(settings.profile)
      setNotifications(settings.notifications)
      setEmail(settings.email)
      setSystem(settings.system)
      setSessions(sessionData.sessions)
      applyThemePreference(settings.profile.theme)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const resetFeedback = () => {
    setError("")
    setMessage("")
  }

  const saveProfile = async () => {
    resetFeedback()
    try {
      const updated = await updateSettings({ profile }) as { profile: ProfileSettings }
      setProfile(updated.profile)
      applyThemePreference(updated.profile.theme)
      if (session) {
        saveSession({
          ...session,
          user: {
            ...session.user,
            name: updated.profile.name,
            email: updated.profile.email,
            theme: updated.profile.theme,
          },
        })
      }
      setMessage("Account settings saved")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile")
    }
  }

  const saveNotificationSettings = async () => {
    resetFeedback()
    try {
      await updateSettings({ notifications })
      setMessage("Notification settings saved")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notification settings")
    }
  }

  const saveEmailSettings = async () => {
    resetFeedback()
    try {
      await updateSettings({
        notifications: {
          emailEnabled: notifications.emailEnabled,
          alertEmail: notifications.alertEmail,
          ccEmail: notifications.ccEmail,
        },
        email,
      })
      setMessage("Email settings saved")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save email settings")
    }
  }

  const saveSystemSettings = async () => {
    resetFeedback()
    try {
      await updateSettings({ system })
      setMessage("System settings saved")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save system settings")
    }
  }

  const changePassword = async () => {
    resetFeedback()

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError("All password fields are required")
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords do not match")
      return
    }

    try {
      await updatePassword(passwordForm.currentPassword, passwordForm.newPassword)
      clearSession()
      router.replace("/login")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password")
    }
  }

  const signOutSessions = async (scope: "current" | "others" | "all") => {
    resetFeedback()
    try {
      await revokeSessions(scope)
      if (scope === "current" || scope === "all") {
        clearSession()
        router.replace("/login")
        return
      }
      await load()
      setMessage("Sessions updated")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update sessions")
    }
  }

  const sendSettingsTestEmail = async () => {
    resetFeedback()
    try {
      await sendTestEmail()
      setMessage("Test email sent")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send test email")
    }
  }

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Loading settings...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and system preferences</p>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{message}</div> : null}

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal information and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" value={profile.role} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={profile.department} onChange={(event) => setProfile((current) => ({ ...current, department: event.target.value }))} />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">Choose your preferred color scheme</p>
                </div>
                <Select
                  value={profile.theme}
                  onValueChange={(value) => {
                    const theme = value as ThemePreference
                    setProfile((current) => ({ ...current, theme }))
                    applyThemePreference(theme)
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Timezone</p>
                  <p className="text-sm text-muted-foreground">Set your local timezone</p>
                </div>
                <Input className="w-[220px]" value={profile.timezone} onChange={(event) => setProfile((current) => ({ ...current, timezone: event.target.value }))} />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveProfile}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Configure how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive alerts and scan results via email</p>
                </div>
                <Switch checked={notifications.emailEnabled} onCheckedChange={(checked) => setNotifications((current) => ({ ...current, emailEnabled: checked }))} disabled={!isAdmin} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">High Risk Alerts</p>
                  <p className="text-sm text-muted-foreground">Immediate alerts for critical vulnerabilities</p>
                </div>
                <Switch checked={notifications.highRiskAlerts} onCheckedChange={(checked) => setNotifications((current) => ({ ...current, highRiskAlerts: checked }))} disabled={!isAdmin} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Scan Completion</p>
                  <p className="text-sm text-muted-foreground">Notify when scans complete</p>
                </div>
                <Switch checked={notifications.scanCompletion} onCheckedChange={(checked) => setNotifications((current) => ({ ...current, scanCompletion: checked }))} disabled={!isAdmin} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Agent Status</p>
                  <p className="text-sm text-muted-foreground">Alert when agents go offline</p>
                </div>
                <Switch checked={notifications.agentOffline} onCheckedChange={(checked) => setNotifications((current) => ({ ...current, agentOffline: checked }))} disabled={!isAdmin} />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveNotificationSettings} disabled={!isAdmin}>Save Notification Settings</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="size-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>Configure SMTP settings and alert recipients</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Alert Email Address</Label>
                  <Input value={notifications.alertEmail} onChange={(event) => setNotifications((current) => ({ ...current, alertEmail: event.target.value }))} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label>CC Email</Label>
                  <Input value={notifications.ccEmail} onChange={(event) => setNotifications((current) => ({ ...current, ccEmail: event.target.value }))} disabled={!isAdmin} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input value={email.host} onChange={(event) => setEmail((current) => ({ ...current, host: event.target.value }))} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input type="number" value={email.port} onChange={(event) => setEmail((current) => ({ ...current, port: Number(event.target.value) || 587 }))} disabled={!isAdmin} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>SMTP Username</Label>
                  <Input value={email.username} onChange={(event) => setEmail((current) => ({ ...current, username: event.target.value }))} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Password</Label>
                  <Input type="password" value={email.password} onChange={(event) => setEmail((current) => ({ ...current, password: event.target.value }))} disabled={!isAdmin} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>From Address</Label>
                  <Input value={email.from} onChange={(event) => setEmail((current) => ({ ...current, from: event.target.value }))} disabled={!isAdmin} />
                </div>
                <div className="mt-8 flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="font-medium">Secure Connection</p>
                    <p className="text-sm text-muted-foreground">Use SMTPS/TLS</p>
                  </div>
                  <Switch checked={email.secure} onCheckedChange={(checked) => setEmail((current) => ({ ...current, secure: checked }))} disabled={!isAdmin} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={sendSettingsTestEmail} disabled={!isAdmin}>Send Test Email</Button>
                <Button onClick={saveEmailSettings} disabled={!isAdmin}>Save Email Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-5" />
                Password
              </CardTitle>
              <CardDescription>Change your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
              </div>
              <div className="flex justify-end">
                <Button onClick={changePassword}>Update Password</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>Manage your active login sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessions.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Globe className="size-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{entry.current ? "Current Session" : "Active Session"}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.userAgent || "Unknown client"}
                        {entry.ipAddress ? ` - ${entry.ipAddress}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">Started {new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={entry.current ? "text-sm text-green-600" : "text-sm text-muted-foreground"}>
                    {entry.current ? "Active now" : "Signed in"}
                  </span>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" className="w-full" onClick={() => signOutSessions("others")}>Sign Out All Other Sessions</Button>
                <Button variant="destructive" className="w-full" onClick={() => signOutSessions("current")}>Sign Out Current Session</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-5" />
                System Settings
              </CardTitle>
              <CardDescription>Configure scan defaults and data retention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Default Scan Type</p>
                  <p className="text-sm text-muted-foreground">Default scan type for new schedules and queued scans</p>
                </div>
                <Select value={system.defaultScanType} onValueChange={(value) => setSystem((current) => ({ ...current, defaultScanType: value }))} disabled={!isAdmin}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">Quick Scan</SelectItem>
                    <SelectItem value="standard">Standard Scan</SelectItem>
                    <SelectItem value="full">Advanced Scan</SelectItem>
                    <SelectItem value="vuln">Vulnerability Scan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-generate Reports</p>
                  <p className="text-sm text-muted-foreground">Create reports after scan completion</p>
                </div>
                <Switch checked={system.autoGenerateReports} onCheckedChange={(checked) => setSystem((current) => ({ ...current, autoGenerateReports: checked }))} disabled={!isAdmin} />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Data Retention</p>
                  <p className="text-sm text-muted-foreground">Keep findings, alerts, reports, and results for this many days</p>
                </div>
                <Input
                  className="w-[150px]"
                  type="number"
                  min={1}
                  max={365}
                  value={system.dataRetentionDays}
                  onChange={(event) => setSystem((current) => ({ ...current, dataRetentionDays: Math.max(1, Math.min(365, Number(event.target.value) || 1)) }))}
                  disabled={!isAdmin}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveSystemSettings} disabled={!isAdmin}>Save System Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
