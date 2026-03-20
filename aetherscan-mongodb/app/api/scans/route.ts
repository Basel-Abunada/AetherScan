import { NextResponse } from "next/server"
import { requireUser } from "@/lib/aetherscan/auth"
import { getVisibleScans } from "@/lib/aetherscan/access"
import { readDatabase } from "@/lib/aetherscan/store"

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response
  const database = await readDatabase()
  const scans = getVisibleScans(database, auth.user)
  return NextResponse.json(scans.slice().reverse())
}
