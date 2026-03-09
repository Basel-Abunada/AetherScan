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

loadEnvFile()

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
const databaseName = process.env.AETHERSCAN_DB_NAME || "aetherscan_mongodb"
const client = new MongoClient(mongoUri)
const entityCollections = ["users", "sessions", "agents", "schedules", "assets", "findings", "alerts", "scans", "reports"]

try {
  await client.connect()
  const database = client.db(databaseName)
  await database.command({ ping: 1 })

  const existingCollections = new Set((await database.listCollections({}, { nameOnly: true }).toArray()).map((collection) => collection.name))
  const counts = []

  for (const name of [...entityCollections, "settings", "metadata", "app_state"]) {
    const count = existingCollections.has(name) ? await database.collection(name).countDocuments() : 0
    counts.push(`${name}: ${count}`)
  }

  console.log("MongoDB connection OK")
  console.log(`URI: ${mongoUri}`)
  console.log(`Database: ${databaseName}`)
  console.log(`Collections: ${counts.join(", ")}`)
} finally {
  await client.close()
}
