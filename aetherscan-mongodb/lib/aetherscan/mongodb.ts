import { MongoClient, type Collection, type Db, type Document, type IndexDescription } from "mongodb"

declare global {
  // eslint-disable-next-line no-var
  var __aetherscanMongoClientPromise: Promise<MongoClient> | undefined
  // eslint-disable-next-line no-var
  var __aetherscanMongoInitPromise: Promise<void> | undefined
}

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"

const collectionIndexes: Array<{ name: string; indexes: IndexDescription[] }> = [
  { name: "users", indexes: [{ key: { id: 1 }, unique: true }, { key: { email: 1 }, unique: true }, { key: { role: 1 } }] },
  { name: "sessions", indexes: [{ key: { id: 1 }, unique: true }, { key: { token: 1 }, unique: true }, { key: { userId: 1 } }, { key: { expiresAt: 1 } }] },
  { name: "agents", indexes: [{ key: { id: 1 }, unique: true }, { key: { authToken: 1 }, unique: true, sparse: true }, { key: { status: 1 } }] },
  { name: "schedules", indexes: [{ key: { id: 1 }, unique: true }, { key: { agentId: 1 } }, { key: { status: 1 } }] },
  { name: "assets", indexes: [{ key: { id: 1 }, unique: true }, { key: { ipAddress: 1 } }, { key: { hostname: 1 } }] },
  { name: "findings", indexes: [{ key: { id: 1 }, unique: true }, { key: { scanId: 1 } }, { key: { assetId: 1 } }, { key: { riskLevel: 1 } }, { key: { status: 1 } }] },
  { name: "alerts", indexes: [{ key: { id: 1 }, unique: true }, { key: { acknowledged: 1 } }, { key: { createdAt: -1 } }] },
  { name: "scans", indexes: [{ key: { id: 1 }, unique: true }, { key: { agentId: 1 } }, { key: { status: 1 } }, { key: { startedAt: -1 } }] },
  { name: "reports", indexes: [{ key: { id: 1 }, unique: true }, { key: { generatedAt: -1 } }, { key: { type: 1 } }] },
  { name: "settings", indexes: [{ key: { _id: 1 }, unique: true }] },
  { name: "metadata", indexes: [{ key: { _id: 1 }, unique: true }] },
]

function getClientPromise() {
  if (!global.__aetherscanMongoClientPromise) {
    const client = new MongoClient(mongoUri)
    global.__aetherscanMongoClientPromise = client.connect()
  }
  return global.__aetherscanMongoClientPromise
}

export function getMongoDatabaseName() {
  return process.env.AETHERSCAN_DB_NAME || "aetherscan_mongodb"
}

export async function getMongoDatabase(): Promise<Db> {
  const connectedClient = await getClientPromise()
  return connectedClient.db(getMongoDatabaseName())
}

export async function getMongoCollection<T extends Document>(name: string): Promise<Collection<T>> {
  const database = await getMongoDatabase()
  return database.collection<T>(name)
}

export async function ensureMongoCollections() {
  if (!global.__aetherscanMongoInitPromise) {
    global.__aetherscanMongoInitPromise = (async () => {
      const database = await getMongoDatabase()
      const existingNames = new Set((await database.listCollections({}, { nameOnly: true }).toArray()).map((collection) => collection.name))

      for (const { name, indexes } of collectionIndexes) {
        if (!existingNames.has(name)) {
          await database.createCollection(name)
        }

        const collection = database.collection(name)
        for (const index of indexes) {
          await collection.createIndex(index.key, index)
        }
      }
    })()
  }

  await global.__aetherscanMongoInitPromise
}

