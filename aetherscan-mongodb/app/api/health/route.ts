import { NextResponse } from "next/server"
import { getMongoDatabase } from "@/lib/aetherscan/mongodb"
import { getStorageOverview } from "@/lib/aetherscan/store"

export async function GET() {
  try {
    const database = await getMongoDatabase()
    await database.command({ ping: 1 })
    const storage = await getStorageOverview()

    return NextResponse.json({
      ok: true,
      app: "AetherScan MongoDB",
      database: database.databaseName,
      storage,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      app: "AetherScan MongoDB",
      error: error instanceof Error ? error.message : "Failed to connect to MongoDB",
      timestamp: new Date().toISOString(),
    }, { status: 503 })
  }
}
