import { NextResponse } from "next/server"
import { requireUser } from "@/lib/aetherscan/auth"
import { readDatabase } from "@/lib/aetherscan/store"

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response
  const database = await readDatabase()
  return NextResponse.json(database.scans.slice().reverse())
}
