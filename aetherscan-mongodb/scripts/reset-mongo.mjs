import fs from "node:fs"
import path from "node:path"
import { MongoClient } from "mongodb"
import crypto from "node:crypto"

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

function nowIso() {
  return new Date().toISOString()
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex")
}

loadEnvFile()

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
const databaseName = process.env.AETHERSCAN_DB_NAME || "aetherscan_mongodb"
const client = new MongoClient(mongoUri)

const createdAt = nowIso()
const defaultSettings = {
  notifications: {
    emailEnabled: false,
    highRiskAlerts: true,
    scanCompletion: true,
    agentOffline: true,
    weeklySummary: false,
    alertEmail: "",
    ccEmail: "",
  },
  email: {
    host: "",
    port: 587,
    secure: false,
    username: "",
    password: "",
    from: "",
  },
  system: {
    defaultScanType: "standard",
    autoGenerateReports: true,
    dataRetentionDays: 90,
  },
}

const users = [
  {
    id: "user_admin",
    name: "System Administrator",
    email: "admin@aetherscan.local",
    passwordHash: hashPassword("Admin123!"),
    role: "admin",
    status: "active",
    createdAt,
    lastLoginAt: createdAt,
    department: "Cybersecurity",
    theme: "system",
    language: "en",
    timezone: "Asia/Kuala_Lumpur",
  },
  {
    id: "user_engineer",
    name: "Network Engineer",
    email: "engineer@aetherscan.local",
    passwordHash: hashPassword("Engineer123!"),
    role: "engineer",
    status: "active",
    createdAt,
    department: "Network Operations",
    theme: "system",
    language: "en",
    timezone: "Asia/Kuala_Lumpur",
  },
  {
    id: "user_tech",
    name: "Security Technician",
    email: "tech@aetherscan.local",
    passwordHash: hashPassword("Tech123!"),
    role: "technician",
    status: "active",
    createdAt,
    department: "Security Operations",
    theme: "system",
    language: "en",
    timezone: "Asia/Kuala_Lumpur",
  },
]

try {
  await client.connect()
  const database = client.db(databaseName)

  for (const name of ["users", "sessions", "agents", "schedules", "assets", "findings", "alerts", "scans", "reports"]) {
    await database.collection(name).deleteMany({})
  }

  await database.collection("users").insertMany(users.map((user) => ({ _id: user.id, ...user })))
  await database.collection("settings").replaceOne(
    { _id: "main" },
    { _id: "main", ...defaultSettings, updatedAt: nowIso() },
    { upsert: true },
  )
  await database.collection("metadata").replaceOne(
    { _id: "schema" },
    { _id: "schema", schemaVersion: 2, migratedAt: nowIso(), source: "seed" },
    { upsert: true },
  )

  console.log(`Reset MongoDB database "${databaseName}" with fresh seeded users.`)
} finally {
  await client.close()
}
