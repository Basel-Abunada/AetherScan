import fs from "node:fs"
import path from "node:path"
import { MongoClient } from "mongodb"

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) return

  const raw = fs.readFileSync(envPath, "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const separator = trimmed.indexOf("=")
    if (separator < 0) continue
    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")
    if (!process.env[key]) process.env[key] = value
  }
}

function normalizeStateDocument(raw) {
  if (raw && typeof raw === "object" && raw.database && typeof raw.database === "object") {
    return raw.database
  }
  return raw
}

async function replaceCollection(database, name, items) {
  const collection = database.collection(name)
  await collection.deleteMany({})
  if (Array.isArray(items) && items.length > 0) {
    await collection.insertMany(items.map((item) => ({ _id: item.id, ...item })))
  }
}

loadEnvFile()

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
const databaseName = process.env.AETHERSCAN_DB_NAME || "aetherscan_mongodb"
const sourcePath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : path.resolve(process.cwd(), "..", ".data", "aetherscan.json")

if (!fs.existsSync(sourcePath)) {
  console.error(`Source file not found: ${sourcePath}`)
  process.exit(1)
}

const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8"))
const state = normalizeStateDocument(raw)
const client = new MongoClient(mongoUri)

try {
  await client.connect()
  const database = client.db(databaseName)

  await replaceCollection(database, "users", state.users ?? [])
  await replaceCollection(database, "sessions", state.sessions ?? [])
  await replaceCollection(database, "agents", state.agents ?? [])
  await replaceCollection(database, "schedules", state.schedules ?? [])
  await replaceCollection(database, "assets", state.assets ?? [])
  await replaceCollection(database, "findings", state.findings ?? [])
  await replaceCollection(database, "alerts", state.alerts ?? [])
  await replaceCollection(database, "scans", state.scans ?? [])
  await replaceCollection(database, "reports", state.reports ?? [])

  await database.collection("settings").replaceOne(
    { _id: "main" },
    {
      _id: "main",
      ...(state.settings ?? {}),
      updatedAt: new Date().toISOString(),
    },
    { upsert: true },
  )

  await database.collection("metadata").replaceOne(
    { _id: "schema" },
    {
      _id: "schema",
      schemaVersion: 2,
      migratedAt: new Date().toISOString(),
      source: "collections",
    },
    { upsert: true },
  )

  console.log(`Imported JSON data into MongoDB database "${databaseName}" from ${sourcePath}`)
} finally {
  await client.close()
}
