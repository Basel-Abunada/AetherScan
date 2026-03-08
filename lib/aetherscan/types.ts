export type UserRole = "admin" | "engineer" | "technician"
export type UserStatus = "active" | "inactive"
export type AgentStatus = "online" | "offline" | "degraded"
export type ScheduleStatus = "active" | "paused" | "disabled"
export type ScanStatus = "queued" | "running" | "completed" | "failed"
export type RiskLevel = "high" | "medium" | "low"
export type FindingStatus = "open" | "in-progress" | "resolved"
export type ReportFormat = "pdf" | "csv"
export type ReportType = "scan" | "vulnerability" | "asset" | "executive"
export type ScanType = "quick" | "standard" | "full" | "vuln"
export type ScanMode = "live"

export interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  role: UserRole
  status: UserStatus
  createdAt: string
  lastLoginAt?: string
}

export interface Session {
  id: string
  token: string
  userId: string
  createdAt: string
  expiresAt: string
}

export interface Agent {
  id: string
  name: string
  hostname: string
  ipAddress: string
  platform: string
  description?: string
  status: AgentStatus
  lastSeenAt: string
  mode: ScanMode
  authToken?: string
  targetHint?: string
}

export interface ScanSchedule {
  id: string
  name: string
  agentId: string
  target: string
  frequency: string
  startTime: string
  nextRunAt: string
  lastRunAt?: string
  status: ScheduleStatus
  scanType: ScanType
  mode: ScanMode
}

export interface AssetService {
  port: number
  protocol: "tcp" | "udp"
  name: string
  product?: string
  version?: string
  state: "open" | "closed" | "filtered"
}

export interface Asset {
  id: string
  ipAddress: string
  hostname: string
  os?: string
  status: "up" | "down"
  discoveredAt: string
  lastSeenAt: string
  services: AssetService[]
}

export interface RiskFinding {
  id: string
  scanId: string
  assetId: string
  title: string
  cve?: string
  service: string
  port: number
  riskLevel: RiskLevel
  description: string
  recommendation: string
  source: string
  status: FindingStatus
  discoveredAt: string
}

export interface Alert {
  id: string
  severity: RiskLevel
  title: string
  message: string
  createdAt: string
  acknowledged: boolean
}

export interface ScanResult {
  id: string
  agentId: string
  agentName: string
  target: string
  scanType: ScanType
  mode: ScanMode
  status: ScanStatus
  startedAt: string
  completedAt?: string
  durationSeconds?: number
  totalHosts: number
  assetIds: string[]
  findingIds: string[]
  vulnerabilities: Record<RiskLevel, number>
  summary: string
}

export interface ReportRecord {
  id: string
  name: string
  type: ReportType
  format: ReportFormat
  generatedAt: string
  generatedBy: string
  sizeBytes: number
  downloadPath: string
}

export interface AetherScanDatabase {
  users: User[]
  sessions: Session[]
  agents: Agent[]
  schedules: ScanSchedule[]
  assets: Asset[]
  findings: RiskFinding[]
  alerts: Alert[]
  scans: ScanResult[]
  reports: ReportRecord[]
}
