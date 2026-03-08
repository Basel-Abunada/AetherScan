import { NextResponse } from "next/server"
import { requireUserRole } from "@/lib/aetherscan/auth"
import { readDatabase, updateDatabase } from "@/lib/aetherscan/store"
import { hashPassword, makeId, nowIso } from "@/lib/aetherscan/utils"

export async function GET(request: Request) {
  const auth = await requireUserRole(request, ["admin"])
  if (!auth.user) return auth.response
  const database = await readDatabase()
  return NextResponse.json(database.users.map(({ passwordHash: _passwordHash, ...user }) => user))
}

export async function POST(request: Request) {
  const auth = await requireUserRole(request, ["admin"])
  if (!auth.user) return auth.response

  const body = await request.json()
  const user = {
    id: makeId("user"),
    name: String(body.name ?? "New User"),
    email: String(body.email ?? "").toLowerCase(),
    passwordHash: hashPassword(String(body.password ?? "ChangeMe123!")),
    role: body.role === "admin" || body.role === "engineer" ? body.role : "technician",
    status: "active" as const,
    createdAt: nowIso(),
  }

  await updateDatabase((database) => {
    database.users.push(user)
  })

  const { passwordHash: _passwordHash, ...safeUser } = user
  return NextResponse.json(safeUser, { status: 201 })
}
