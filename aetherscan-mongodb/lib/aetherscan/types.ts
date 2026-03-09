export type UserRole = "admin" | "engineer" | "technician"
export type UserStatus = "active" | "inactive"
export type AgentStatus = "online" | "offline" | "degraded" | "occupied"
export type ScheduleStatus = "active" | "paused" | "disabled"
export type ScanStatus = "queued" | "running" | "completed" | "failed"
export type RiskLevel = "high" | "medium" | "low"
export type FindingStatus = "open" | "in-progress" | "resolved"
export type ReportFormat = "pdf" | "csv"
export type ReportType = "scan" | "vulnerability" | "asset" | "executive"
export type ScanType = "quick" | "standard" | "full" | "vuln"
export type ScanMode = "live"
export type DeviceType = "server" | "workstation" | "laptop" | "printer" | "router" | "mobile" | "switch" | "iot" | "unknown"
export type AlertCategory = "scan-queued" | "scan-started" | "scan-completed" | "finding-high" | "finding-medium" | "system"

export interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  role: UserRole
  status: UserStatus
  createdAt: string
  lastLoginAt?: string
  department?: string
  theme?: "light" | "dark" | "system"
  language?: "en" | "ar"
  timezone?: string
}

export interface Session {
  id: string
  token: string
  userId: string
  createdAt: string
  expiresAt: string
  lastSeenAt?: string
  userAgent?: string
  ipAddress?: string
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
  deviceType?: DeviceType
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
  cveUrl?: string
  service: string
  port: number
  riskLevel: RiskLevel
  description: string
  recommendation: string
  source: string
  referenceUrl?: string
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
  category?: AlertCategory
  scanId?: string
  findingId?: string
  assetId?: string
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

export interface NotificationSettings {
  emailEnabled: boolean
  highRiskAlerts: boolean
  scanCompletion: boolean
  agentOffline: boolean
  weeklySummary: boolean
  alertEmail: string
  ccEmail: string
}

export interface EmailTransportSettings {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  from: string
}

export interface SystemSettings {
  defaultScanType: ScanType
  autoGenerateReports: boolean
  dataRetentionDays: number
}

export interface AetherScanSettings {
  notifications: NotificationSettings
  email: EmailTransportSettings
  system: SystemSettings
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
  settings: AetherScanSettings
}
