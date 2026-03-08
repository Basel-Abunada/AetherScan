import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { DemoDatabase } from "@/lib/aetherscan/types"
import { createSeedDatabase } from "@/lib/aetherscan/seed"

const dataDir = path.join(process.cwd(), ".data")
const dbPath = path.join(dataDir, "aetherscan-demo.json")

async function ensureDatabase() {
  await mkdir(dataDir, { recursive: true })
  try {
    await readFile(dbPath, "utf8")
  } catch {
    await writeFile(dbPath, JSON.stringify(createSeedDatabase(), null, 2), "utf8")
  }
}

export async function readDatabase(): Promise<DemoDatabase> {
  await ensureDatabase()
  const raw = await readFile(dbPath, "utf8")
  return JSON.parse(raw) as DemoDatabase
}

export async function writeDatabase(database: DemoDatabase) {
  await ensureDatabase()
  await writeFile(dbPath, JSON.stringify(database, null, 2), "utf8")
}

export async function updateDatabase<T>(
  updater: (database: DemoDatabase) => T | Promise<T>,
) {
  const database = await readDatabase()
  const result = await updater(database)
  await writeDatabase(database)
  return result
}
