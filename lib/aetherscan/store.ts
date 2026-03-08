import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { AetherScanDatabase } from "@/lib/aetherscan/types"
import { createSeedDatabase } from "@/lib/aetherscan/seed"

const dataDir = path.join(process.cwd(), ".data")
const dbPath = path.join(dataDir, "aetherscan.json")
const legacyDbPath = path.join(dataDir, ["aetherscan", "de", "mo", "json"].join("."))
const legacyEmailSuffix = ["@aetherscan", "de", "mo"].join(".")
const legacyTargetNames = ["hq", "lab", "branch"].map((segment) => ["de", "mo", segment].join("-"))
const legacyAgentNames = [["Agent", "HQ", "Main"], ["Agent", "Branch", "01"], ["Agent", "Lab", "Test"]].map((parts) => parts.join("-"))

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
    const legacyDatabase = JSON.parse(legacyRaw) as AetherScanDatabase
    const database = isLegacySeed(legacyDatabase) ? createSeedDatabase() : legacyDatabase
    await writeFile(dbPath, JSON.stringify(database, null, 2), "utf8")
    return
  } catch {}

  await writeFile(dbPath, JSON.stringify(createSeedDatabase(), null, 2), "utf8")
}

async function migrateDatabase(database: AetherScanDatabase) {
  if (!isLegacySeed(database)) return database
  const fresh = createSeedDatabase()
  await writeFile(dbPath, JSON.stringify(fresh, null, 2), "utf8")
  return fresh
}

export async function readDatabase(): Promise<AetherScanDatabase> {
  await ensureDatabase()
  const raw = await readFile(dbPath, "utf8")
  const database = JSON.parse(raw) as AetherScanDatabase
  return migrateDatabase(database)
}

export async function writeDatabase(database: AetherScanDatabase) {
  await ensureDatabase()
  await writeFile(dbPath, JSON.stringify(database, null, 2), "utf8")
}

export async function updateDatabase<T>(updater: (database: AetherScanDatabase) => T | Promise<T>) {
  const database = await readDatabase()
  const result = await updater(database)
  await writeDatabase(database)
  return result
}
