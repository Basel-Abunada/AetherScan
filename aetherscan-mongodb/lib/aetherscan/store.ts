import type { Collection } from "mongodb"
import type {
  AetherScanDatabase,
  Agent,
  Alert,
  Asset,
  ReportRecord,
  RiskFinding,
  ScanResult,
  ScanSchedule,
  Session,
  User,
} from "@/lib/aetherscan/types"
import { sendNotificationEmail } from "@/lib/aetherscan/email"
import { ensureMongoCollections, getMongoCollection, getMongoDatabase } from "@/lib/aetherscan/mongodb"
import { createDefaultSettings, createSeedDatabase } from "@/lib/aetherscan/seed"
import { makeId, nowIso } from "@/lib/aetherscan/utils"

const STATE_DOCUMENT_ID = "main"
const SETTINGS_DOCUMENT_ID = "main"
const METADATA_DOCUMENT_ID = "schema"
const SCHEMA_VERSION = 2
const legacyEmailSuffix = ["@aetherscan", "de", "mo"].join(".")
const legacyTargetNames = ["hq", "lab", "branch"].map((segment) => ["de", "mo", segment].join("-"))
const legacyAgentNames = [["Agent", "HQ", "Main"], ["Agent", "Branch", "01"], ["Agent", "Lab", "Test"]].map((parts) => parts.join("-"))
const OFFLINE_AFTER_MS = 15_000
const OCCUPIED_OFFLINE_AFTER_MS = 20 * 60 * 1000

type SettingsDocument = AetherScanDatabase["settings"] & {
  _id: string
  updatedAt: string
}

type MetadataDocument = {
  _id: string
  schemaVersion: number
  migratedAt: string
  source: "seed" | "legacy-app-state" | "collections"
}

type LegacyStateDocument = {
  _id: string
  database: AetherScanDatabase
  updatedAt: string
}

type EntityMap = {
  users: User
  sessions: Session
  agents: Agent
  schedules: ScanSchedule
  assets: Asset
  findings: RiskFinding
  alerts: Alert
  scans: ScanResult
  reports: ReportRecord
}

type EntityCollectionName = keyof EntityMap

type StoredEntity<T extends { id: string }> = T & { _id: string }

const entityCollections: EntityCollectionName[] = ["users", "sessions", "agents", "schedules", "assets", "findings", "alerts", "scans", "reports"]

function withDefaults(database: AetherScanDatabase): AetherScanDatabase {
  const defaultSettings = createDefaultSettings()

  database.settings ??= defaultSettings
  database.settings.notifications ??= defaultSettings.notifications
  database.settings.email ??= defaultSettings.email
  database.settings.system ??= defaultSettings.system

  for (const user of database.users as User[]) {
    user.department ??= user.role === "admin" ? "Cybersecurity" : user.role === "engineer" ? "Network Operations" : "Security Operations"
    user.theme ??= "system"
    user.language ??= "en"
    user.timezone ??= "Asia/Kuala_Lumpur"
  }

  return database
}

function parseTimestamp(value?: string) {
  if (!value) return Number.NaN
  return new Date(value).getTime()
}

function applyDataRetentionPolicy(database: AetherScanDatabase) {
  const retentionDays = Math.max(1, Math.min(365, database.settings.system.dataRetentionDays || 90))
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  let changed = false

  const retainedScans = database.scans.filter((scan) => {
    const referenceTime = parseTimestamp(scan.completedAt ?? scan.startedAt)
    return Number.isNaN(referenceTime) || referenceTime >= cutoff
  })
  if (retainedScans.length !== database.scans.length) {
    database.scans = retainedScans
    changed = true
  }

  const retainedScanIds = new Set(database.scans.map((scan) => scan.id))

  const retainedFindings = database.findings.filter((finding) => {
    const referenceTime = parseTimestamp(finding.discoveredAt)
    return retainedScanIds.has(finding.scanId) && (Number.isNaN(referenceTime) || referenceTime >= cutoff)
  })
  if (retainedFindings.length !== database.findings.length) {
    database.findings = retainedFindings
    changed = true
  }

  const retainedFindingIds = new Set(database.findings.map((finding) => finding.id))
  const referencedAssetIds = new Set([
    ...database.scans.flatMap((scan) => scan.assetIds),
    ...database.findings.map((finding) => finding.assetId),
  ])

  const retainedAssets = database.assets.filter((asset) => {
    const referenceTime = parseTimestamp(asset.lastSeenAt)
    return referencedAssetIds.has(asset.id) || Number.isNaN(referenceTime) || referenceTime >= cutoff
  })
  if (retainedAssets.length !== database.assets.length) {
    database.assets = retainedAssets
    changed = true
  }

  const retainedAssetIds = new Set(database.assets.map((asset) => asset.id))

  database.scans = database.scans.map((scan) => ({
    ...scan,
    assetIds: scan.assetIds.filter((assetId) => retainedAssetIds.has(assetId)),
    findingIds: scan.findingIds.filter((findingId) => retainedFindingIds.has(findingId)),
  }))

  const retainedReports = database.reports.filter((report) => {
    const referenceTime = parseTimestamp(report.generatedAt)
    return Number.isNaN(referenceTime) || referenceTime >= cutoff
  })
  if (retainedReports.length !== database.reports.length) {
    database.reports = retainedReports
    changed = true
  }

  const retainedAlerts = database.alerts.filter((alert) => {
    const referenceTime = parseTimestamp(alert.createdAt)
    if (!Number.isNaN(referenceTime) && referenceTime < cutoff) return false
    if (alert.scanId && !retainedScanIds.has(alert.scanId)) return false
    if (alert.findingId && !retainedFindingIds.has(alert.findingId)) return false
    if (alert.assetId && !retainedAssetIds.has(alert.assetId)) return false
    return true
  })
  if (retainedAlerts.length !== database.alerts.length) {
    database.alerts = retainedAlerts
    changed = true
  }

  return changed
}

function isLegacySeed(database: AetherScanDatabase) {
  const legacyEmails = database.users.some((user) => user.email.endsWith(legacyEmailSuffix))
  const legacyAgents = database.agents.some((agent) => legacyAgentNames.includes(agent.name))
  const legacyTargets = database.schedules.some((schedule) => legacyTargetNames.includes(schedule.target))
  return legacyEmails || legacyAgents || legacyTargets
}

async function getEntityCollection<K extends EntityCollectionName>(name: K): Promise<Collection<StoredEntity<EntityMap[K]>>> {
  return getMongoCollection<StoredEntity<EntityMap[K]>>(name)
}

async function getSettingsCollection() {
  return getMongoCollection<SettingsDocument>("settings")
}

async function getMetadataCollection() {
  return getMongoCollection<MetadataDocument>("metadata")
}

async function getLegacyStateCollection() {
  return getMongoCollection<LegacyStateDocument>("app_state")
}

function serializeEntity<T extends { id: string }>(entity: T): StoredEntity<T> {
  return { _id: entity.id, ...entity }
}

function stripStoredEntity<T extends { id: string }>(entity: StoredEntity<T>): T {
  const { _id: _ignored, ...rest } = entity
  return rest as T
}

async function replaceEntityCollection<K extends EntityCollectionName>(name: K, items: EntityMap[K][]) {
  const collection = await getEntityCollection(name)
  await collection.deleteMany({})

  if (items.length > 0) {
    await collection.insertMany(items.map((item) => serializeEntity(item)))
  }
}

async function readEntityCollection<K extends EntityCollectionName>(name: K): Promise<EntityMap[K][]> {
  const collection = await getEntityCollection(name)
  const documents = await collection.find({}).toArray()
  return documents.map((document) => stripStoredEntity(document))
}

async function persistSettings(settings: AetherScanDatabase["settings"]) {
  const collection = await getSettingsCollection()
  await collection.replaceOne(
    { _id: SETTINGS_DOCUMENT_ID },
    {
      _id: SETTINGS_DOCUMENT_ID,
      ...settings,
      updatedAt: nowIso(),
    },
    { upsert: true },
  )
}

async function readSettings(): Promise<AetherScanDatabase["settings"]> {
  const collection = await getSettingsCollection()
  const document = await collection.findOne({ _id: SETTINGS_DOCUMENT_ID })
  if (!document) {
    return createDefaultSettings()
  }

  const { _id: _ignored, updatedAt: _updatedAt, ...settings } = document
  return settings
}

async function writeMetadata(source: MetadataDocument["source"]) {
  const collection = await getMetadataCollection()
  await collection.replaceOne(
    { _id: METADATA_DOCUMENT_ID },
    {
      _id: METADATA_DOCUMENT_ID,
      schemaVersion: SCHEMA_VERSION,
      migratedAt: nowIso(),
      source,
    },
    { upsert: true },
  )
}

async function isStructuredStorageInitialized() {
  const metadataCollection = await getMetadataCollection()
  const metadata = await metadataCollection.findOne({ _id: METADATA_DOCUMENT_ID })
  if (metadata?.schemaVersion === SCHEMA_VERSION) {
    return true
  }

  const usersCollection = await getEntityCollection("users")
  const userCount = await usersCollection.countDocuments()
  const settingsCollection = await getSettingsCollection()
  const settings = await settingsCollection.findOne({ _id: SETTINGS_DOCUMENT_ID })
  return userCount > 0 || Boolean(settings)
}

async function persistDatabase(database: AetherScanDatabase, source: MetadataDocument["source"] = "collections") {
  const hydrated = withDefaults(structuredClone(database))

  for (const collectionName of entityCollections) {
    await replaceEntityCollection(collectionName, hydrated[collectionName])
  }

  await persistSettings(hydrated.settings)
  await writeMetadata(source)
}

async function assembleDatabase(): Promise<AetherScanDatabase> {
  const [
    users,
    sessions,
    agents,
    schedules,
    assets,
    findings,
    alerts,
    scans,
    reports,
    settings,
  ] = await Promise.all([
    readEntityCollection("users"),
    readEntityCollection("sessions"),
    readEntityCollection("agents"),
    readEntityCollection("schedules"),
    readEntityCollection("assets"),
    readEntityCollection("findings"),
    readEntityCollection("alerts"),
    readEntityCollection("scans"),
    readEntityCollection("reports"),
    readSettings(),
  ])

  return withDefaults({
    users,
    sessions,
    agents,
    schedules,
    assets,
    findings,
    alerts,
    scans,
    reports,
    settings,
  })
}

async function migrateLegacyAppStateIfNeeded() {
  await ensureMongoCollections()

  if (await isStructuredStorageInitialized()) {
    return
  }

  const legacyState = await (await getLegacyStateCollection()).findOne({ _id: STATE_DOCUMENT_ID })
  if (legacyState?.database) {
    const legacyDatabase = withDefaults(structuredClone(legacyState.database))
    const migratedDatabase = isLegacySeed(legacyDatabase) ? createSeedDatabase() : legacyDatabase
    await persistDatabase(migratedDatabase, "legacy-app-state")
    return
  }

  await persistDatabase(createSeedDatabase(), "seed")
}

async function applyRuntimeState(database: AetherScanDatabase) {
  let changed = false
  const offlineAgents: Agent[] = []

  const activeSessions = database.sessions.filter((session) => new Date(session.expiresAt).getTime() > Date.now())
  if (activeSessions.length !== database.sessions.length) {
    database.sessions = activeSessions
    changed = true
  }

  changed = applyDataRetentionPolicy(database) || changed

  for (const agent of database.agents) {
    const lastSeenDelta = Date.now() - new Date(agent.lastSeenAt).getTime()
    const timeout = agent.status === "occupied" ? OCCUPIED_OFFLINE_AFTER_MS : OFFLINE_AFTER_MS
    const shouldBeOffline = lastSeenDelta > timeout
    if (shouldBeOffline && agent.status !== "offline") {
      agent.status = "offline"
      changed = true
      offlineAgents.push(agent)
      database.alerts.unshift({
        id: makeId("alert"),
        severity: "medium",
        title: `Agent offline: ${agent.name}`,
        message: `${agent.name} has stopped polling the AetherScan server.`,
        createdAt: nowIso(),
        acknowledged: false,
      })
    }
  }

  if (changed) {
    await persistDatabase(database)
    if (database.settings.notifications.agentOffline) {
      for (const agent of offlineAgents) {
        await sendNotificationEmail(database, {
          subject: `AetherScan agent offline: ${agent.name}`,
          text: `${agent.name} (${agent.ipAddress}) has gone offline and is no longer polling the server.`,
        }).catch(() => null)
      }
    }
  }

  return database
}

export async function readDatabase(): Promise<AetherScanDatabase> {
  await migrateLegacyAppStateIfNeeded()
  const database = await assembleDatabase()
  return applyRuntimeState(database)
}

export async function writeDatabase(database: AetherScanDatabase) {
  await migrateLegacyAppStateIfNeeded()
  await persistDatabase(database)
}

export async function updateDatabase<T>(updater: (database: AetherScanDatabase) => T | Promise<T>) {
  const database = await readDatabase()
  const result = await updater(database)
  await writeDatabase(database)
  return result
}

export async function getStorageOverview() {
  await migrateLegacyAppStateIfNeeded()
  const database = await getMongoDatabase()
  const counts = Object.fromEntries(
    await Promise.all(
      entityCollections.map(async (name) => [name, await database.collection(name).countDocuments()]),
    ),
  )

  return {
    database: database.databaseName,
    collections: [...entityCollections, "settings", "metadata"],
    counts,
  }
}
