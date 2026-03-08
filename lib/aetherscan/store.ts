import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { AetherScanDatabase, Agent, User } from "@/lib/aetherscan/types"
import { sendNotificationEmail } from "@/lib/aetherscan/email"
import { createDefaultSettings, createSeedDatabase } from "@/lib/aetherscan/seed"
import { makeId, nowIso } from "@/lib/aetherscan/utils"

const dataDir = path.join(process.cwd(), ".data")
const dbPath = path.join(dataDir, "aetherscan.json")
const legacyDbPath = path.join(dataDir, ["aetherscan", "de", "mo", "json"].join("."))
const legacyEmailSuffix = ["@aetherscan", "de", "mo"].join(".")
const legacyTargetNames = ["hq", "lab", "branch"].map((segment) => ["de", "mo", segment].join("-"))
const legacyAgentNames = [["Agent", "HQ", "Main"], ["Agent", "Branch", "01"], ["Agent", "Lab", "Test"]].map((parts) => parts.join("-"))
const OFFLINE_AFTER_MS = 15_000

function withDefaults(database: AetherScanDatabase): AetherScanDatabase {
  database.settings ??= createDefaultSettings()
  database.settings.notifications ??= createDefaultSettings().notifications
  database.settings.email ??= createDefaultSettings().email
  database.settings.system ??= createDefaultSettings().system

  for (const user of database.users as User[]) {
    user.department ??= user.role === "admin" ? "Cybersecurity" : user.role === "engineer" ? "Network Operations" : "Security Operations"
    user.theme ??= "system"
    user.language ??= "en"
    user.timezone ??= "Asia/Kuala_Lumpur"
  }

  return database
}

function isLegacySeed(database: AetherScanDatabase) {
  const legacyEmails = database.users.some((user) => user.email.endsWith(legacyEmailSuffix))
  const legacyAgents = database.agents.some((agent) => legacyAgentNames.includes(agent.name))
  const legacyTargets = database.schedules.some((schedule) => legacyTargetNames.includes(schedule.target))
  return legacyEmails || legacyAgents || legacyTargets
}

async function ensureDatabase() {
  await mkdir(dataDir, { recursive: true })

  try {
    await readFile(dbPath, "utf8")
    return
  } catch {}

  try {
    const legacyRaw = await readFile(legacyDbPath, "utf8")
    const legacyDatabase = withDefaults(JSON.parse(legacyRaw) as AetherScanDatabase)
    const database = isLegacySeed(legacyDatabase) ? createSeedDatabase() : legacyDatabase
    await writeFile(dbPath, JSON.stringify(database, null, 2), "utf8")
    return
  } catch {}

  await writeFile(dbPath, JSON.stringify(createSeedDatabase(), null, 2), "utf8")
}

async function migrateDatabase(database: AetherScanDatabase) {
  const hydrated = withDefaults(database)
  if (!isLegacySeed(hydrated)) return hydrated
  const fresh = createSeedDatabase()
  await writeFile(dbPath, JSON.stringify(fresh, null, 2), "utf8")
  return fresh
}

async function applyRuntimeState(database: AetherScanDatabase) {
  let changed = false
  const offlineAgents: Agent[] = []

  database.sessions = database.sessions.filter((session) => new Date(session.expiresAt).getTime() > Date.now())

  for (const agent of database.agents) {
    const shouldBeOffline = Date.now() - new Date(agent.lastSeenAt).getTime() > OFFLINE_AFTER_MS
    if (shouldBeOffline && agent.status === "online") {
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
    await writeFile(dbPath, JSON.stringify(database, null, 2), "utf8")
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
  await ensureDatabase()
  const raw = await readFile(dbPath, "utf8")
  const database = await migrateDatabase(JSON.parse(raw) as AetherScanDatabase)
  return applyRuntimeState(database)
}

export async function writeDatabase(database: AetherScanDatabase) {
  await ensureDatabase()
  await writeFile(dbPath, JSON.stringify(withDefaults(database), null, 2), "utf8")
}

export async function updateDatabase<T>(updater: (database: AetherScanDatabase) => T | Promise<T>) {
  const database = await readDatabase()
  const result = await updater(database)
  await writeDatabase(database)
  return result
}
