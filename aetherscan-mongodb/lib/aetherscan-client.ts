import type { Agent, Alert, Asset, ReportRecord, RiskFinding, ScanResult, ScanSchedule, Session, User } from "@/lib/aetherscan/types"

export type ClientSession = {
  token: string
  user: Pick<User, "id" | "name" | "email" | "role">
}

const SESSION_KEY = "aetherscan-session"

async function apiRequest<T>(input: string, init?: RequestInit): Promise<T> {
  const session = loadSession()
  const headers = new Headers(init?.headers)
  if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json")
  if (session?.token) headers.set("Authorization", `Bearer ${session.token}`)

  const response = await fetch(input, { ...init, headers })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed with status ${response.status}`)
  }
  return response.json() as Promise<T>
}

export function loadSession(): ClientSession | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as ClientSession
  } catch {
    window.localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function saveSession(session: ClientSession) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(SESSION_KEY)
}

export function formatDateTime(value?: string) {
  if (!value) return "N/A"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date)
}

export function timeAgo(value?: string) {
  if (!value) return "Never"
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const hours = Math.round(diffMinutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

export function scanTypeLabel(scanType: string) {
  switch (scanType) {
    case "quick": return "Quick Scan"
    case "standard": return "Standard Scan"
    case "full": return "Advanced Scan"
    case "vuln": return "Vulnerability Scan"
    default: return scanType
  }
}

export async function login(email: string, password: string) { return apiRequest<ClientSession>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }) }
export async function fetchDashboard() { return apiRequest<{ stats: { assets: number; vulnerabilities: number; highRisk: number; resolvedIssues: number; activeAgents: number; totalAgents: number }; riskDistribution: { high: number; medium: number; low: number }; recentScans: ScanResult[]; alerts: Alert[]; agents: Agent[] }>("/api/dashboard") }
export async function fetchUsers() { return apiRequest<Array<Omit<User, "passwordHash">>>("/api/users") }
export async function createUser(payload: { name: string; email: string; role: string; password: string; department?: string }) { return apiRequest<Omit<User, "passwordHash">>("/api/users", { method: "POST", body: JSON.stringify(payload) }) }
export async function updateUser(id: string, payload: Partial<Pick<User, "name" | "email" | "role" | "status" | "department">>) { return apiRequest<Omit<User, "passwordHash">>(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }) }
export async function deleteUser(id: string) { return apiRequest<{ ok: boolean }>(`/api/users/${id}`, { method: "DELETE" }) }
export async function fetchAgents() { return apiRequest<Agent[]>("/api/agents") }
export async function registerAgent(payload: { name: string; hostname: string; ipAddress: string; platform: string; description?: string; mode?: string; targetHint?: string }) { return apiRequest<Agent & { authToken?: string }>("/api/agents/register", { method: "POST", body: JSON.stringify(payload) }) }
export async function updateAgent(id: string, payload: Partial<Pick<Agent, "name" | "hostname" | "ipAddress" | "platform" | "description" | "targetHint" | "status">>) { return apiRequest<Agent>(`/api/agents/${id}`, { method: "PATCH", body: JSON.stringify(payload) }) }
export async function deleteAgent(id: string) { return apiRequest<{ ok: boolean }>(`/api/agents/${id}`, { method: "DELETE" }) }
export async function fetchSchedules() { return apiRequest<ScanSchedule[]>("/api/schedules") }
export async function createSchedule(payload: { name: string; agentId: string; target: string; frequency: string; startTime: string; scanType: string; mode: string }) { return apiRequest<ScanSchedule>("/api/schedules", { method: "POST", body: JSON.stringify(payload) }) }
export async function updateSchedule(id: string, payload: Partial<Pick<ScanSchedule, "status" | "name" | "frequency" | "startTime" | "scanType" | "target">>) { return apiRequest<ScanSchedule>(`/api/schedules/${id}`, { method: "PATCH", body: JSON.stringify(payload) }) }
export async function deleteSchedule(id: string) { return apiRequest<{ ok: boolean }>(`/api/schedules/${id}`, { method: "DELETE" }) }
export async function fetchScans() { return apiRequest<ScanResult[]>("/api/scans") }
export async function runScan(payload: { agentId: string; target: string; scanType: string; mode: string }) { return apiRequest<{ queuedScan: ScanResult | null }>("/api/scans/run", { method: "POST", body: JSON.stringify(payload) }) }
export async function deleteScanResult(id: string) { return apiRequest<{ ok: boolean }>(`/api/scans/${id}`, { method: "DELETE" }) }
export async function fetchVulnerabilities(query?: { risk?: string; status?: string; q?: string }) { const params = new URLSearchParams(); if (query?.risk && query.risk !== "all") params.set("risk", query.risk); if (query?.status && query.status !== "all") params.set("status", query.status); if (query?.q) params.set("q", query.q); const suffix = params.toString() ? `?${params.toString()}` : ""; return apiRequest<{ counts: { total: number; high: number; medium: number; low: number }; findings: Array<RiskFinding & { affectedHost: string; hostname: string }> }>(`/api/vulnerabilities${suffix}`) }
export async function updateFinding(id: string, status: string) { return apiRequest<RiskFinding>(`/api/vulnerabilities/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }) }
export async function deleteFinding(id: string) { return apiRequest<{ ok: boolean }>(`/api/vulnerabilities/${id}`, { method: "DELETE" }) }
export async function fetchAssets() { return apiRequest<Asset[]>("/api/assets") }
export async function fetchReports() { return apiRequest<ReportRecord[]>("/api/reports") }
export async function deleteReport(id: string) { return apiRequest<{ ok: boolean }>(`/api/reports/${id}`, { method: "DELETE" }) }
export async function fetchSettings() { return apiRequest<{ profile: { name: string; email: string; role: string; department: string; theme: string; language: string; timezone: string }; notifications: { emailEnabled: boolean; highRiskAlerts: boolean; scanCompletion: boolean; agentOffline: boolean; weeklySummary: boolean; alertEmail: string; ccEmail: string }; email: { host: string; port: number; secure: boolean; username: string; password: string; from: string }; system: { defaultScanType: string; autoGenerateReports: boolean; dataRetentionDays: number } }>("/api/settings") }
export async function updateSettings(payload: Record<string, unknown>) { return apiRequest("/api/settings", { method: "PATCH", body: JSON.stringify(payload) }) }
export async function sendTestEmail() { return apiRequest<{ ok: boolean }>("/api/settings/test-email", { method: "POST" }) }
export async function fetchSessions() { return apiRequest<{ sessions: Array<Pick<Session, "id" | "createdAt" | "expiresAt" | "lastSeenAt" | "userAgent" | "ipAddress"> & { current: boolean }> }>("/api/auth/sessions") }
export async function revokeSessions(scope: "current" | "others" | "all") { return apiRequest<{ ok: boolean }>("/api/auth/sessions", { method: "DELETE", body: JSON.stringify({ scope }) }) }
export async function updatePassword(currentPassword: string, newPassword: string) { return apiRequest<{ ok: boolean }>("/api/auth/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }) }

export async function downloadReport(payload: { type: string; format: "pdf" | "csv"; generatedBy?: string }) {
  const session = loadSession()
  const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json", ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) }, body: JSON.stringify(payload) })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? "Failed to generate report")
  }
  const blob = await response.blob()
  const contentDisposition = response.headers.get("Content-Disposition")
  const fileName = contentDisposition?.match(/filename="([^"]+)"/)?.[1] ?? `report.${payload.format}`
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}


