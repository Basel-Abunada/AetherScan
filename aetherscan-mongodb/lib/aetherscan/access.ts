import type { Alert, AetherScanDatabase, Asset, ReportRecord, RiskFinding, ScanResult, ScanSchedule, User } from "@/lib/aetherscan/types"

export function isAdmin(user: Pick<User, "role">) {
  return user.role === "admin"
}

export function getVisibleScans(database: AetherScanDatabase, user: Pick<User, "id" | "role">) {
  return isAdmin(user) ? database.scans : database.scans.filter((scan) => scan.createdByUserId === user.id)
}

export function getVisibleSchedules(database: AetherScanDatabase, user: Pick<User, "id" | "role">) {
  return isAdmin(user) ? database.schedules : database.schedules.filter((schedule) => schedule.createdByUserId === user.id)
}

export function getVisibleFindings(database: AetherScanDatabase, user: Pick<User, "id" | "role">) {
  if (isAdmin(user)) return database.findings
  const visibleScanIds = new Set(getVisibleScans(database, user).map((scan) => scan.id))
  return database.findings.filter((finding) => visibleScanIds.has(finding.scanId))
}

export function getVisibleAssets(database: AetherScanDatabase, user: Pick<User, "id" | "role">) {
  if (isAdmin(user)) return database.assets
  const visibleScans = getVisibleScans(database, user)
  const visibleFindings = getVisibleFindings(database, user)
  const visibleAssetIds = new Set([
    ...visibleScans.flatMap((scan) => scan.assetIds),
    ...visibleFindings.map((finding) => finding.assetId),
  ])
  return database.assets.filter((asset) => visibleAssetIds.has(asset.id))
}

export function getVisibleReports(database: AetherScanDatabase, user: Pick<User, "id" | "role">) {
  return isAdmin(user) ? database.reports : database.reports.filter((report) => report.createdByUserId === user.id)
}

export function getVisibleAlerts(database: AetherScanDatabase, user: Pick<User, "id" | "role">) {
  if (isAdmin(user)) return database.alerts

  const visibleScans = getVisibleScans(database, user)
  const visibleFindings = getVisibleFindings(database, user)
  const visibleAssets = getVisibleAssets(database, user)
  const visibleScanIds = new Set(visibleScans.map((scan) => scan.id))
  const visibleFindingIds = new Set(visibleFindings.map((finding) => finding.id))
  const visibleAssetIds = new Set(visibleAssets.map((asset) => asset.id))

  return database.alerts.filter((alert) =>
    (alert.scanId ? visibleScanIds.has(alert.scanId) : false)
    || (alert.findingId ? visibleFindingIds.has(alert.findingId) : false)
    || (alert.assetId ? visibleAssetIds.has(alert.assetId) : false),
  )
}

export function getOwnedReportContent(database: AetherScanDatabase, user: Pick<User, "id" | "role"> | undefined, report?: Pick<ReportRecord, "createdByUserId">) {
  const scopedUser = user && report?.createdByUserId && !isAdmin(user)
    ? { id: report.createdByUserId, role: user.role }
    : user

  if (!scopedUser) {
    return {
      scans: database.scans,
      findings: database.findings,
      assets: database.assets,
    }
  }

  const scans = getVisibleScans(database, scopedUser)
  const findings = getVisibleFindings(database, scopedUser)
  const assets = getVisibleAssets(database, scopedUser)
  return { scans, findings, assets }
}

export type VisibleCollections = {
  scans: ScanResult[]
  schedules: ScanSchedule[]
  findings: RiskFinding[]
  assets: Asset[]
  alerts: Alert[]
  reports: ReportRecord[]
}

export function getVisibleCollections(database: AetherScanDatabase, user: Pick<User, "id" | "role">): VisibleCollections {
  return {
    scans: getVisibleScans(database, user),
    schedules: getVisibleSchedules(database, user),
    findings: getVisibleFindings(database, user),
    assets: getVisibleAssets(database, user),
    alerts: getVisibleAlerts(database, user),
    reports: getVisibleReports(database, user),
  }
}

export function canAccessFinding(database: AetherScanDatabase, user: Pick<User, "id" | "role">, findingId: string) {
  if (isAdmin(user)) return true
  return getVisibleFindings(database, user).some((finding) => finding.id === findingId)
}
