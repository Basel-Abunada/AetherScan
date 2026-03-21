import { NextResponse } from "next/server"
import { requireUserRole } from "@/lib/aetherscan/auth"
import { readDatabase } from "@/lib/aetherscan/store"

export async function GET(request: Request) {
  const auth = await requireUserRole(request, ["admin", "engineer", "technician"])
  if (!auth.user) return auth.response
  const database = await readDatabase()
  return NextResponse.json(database.agents.map(({ authToken: _authToken, ...agent }) => agent))
}
