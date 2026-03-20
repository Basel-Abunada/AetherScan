import { NextResponse } from "next/server"
import { requireUserRole } from "@/lib/aetherscan/auth"
import { createDefaultSettings } from "@/lib/aetherscan/seed"
import { readDatabase, updateDatabase } from "@/lib/aetherscan/store"
import { hashPassword, makeId, nowIso, validatePasswordStrength } from "@/lib/aetherscan/utils"

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
  const password = String(body.password ?? "")
  const passwordError = validatePasswordStrength(password)
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 })
  }
  const defaultSettings = createDefaultSettings()

  const user = {
    id: makeId("user"),
    name: String(body.name ?? "New User"),
    email: String(body.email ?? "").toLowerCase(),
    passwordHash: hashPassword(password),
    role: body.role === "admin" || body.role === "engineer" ? body.role : "technician",
    status: "active" as const,
    createdAt: nowIso(),
    department: String(body.department ?? ""),
    theme: "system" as const,
    language: "en" as const,
    timezone: "Asia/Kuala_Lumpur",
    notificationSettings: defaultSettings.notifications,
    emailSettings: defaultSettings.email,
    systemSettings: defaultSettings.system,
  }

  await updateDatabase((database) => {
    database.users.push(user)
  })

  const { passwordHash: _passwordHash, ...safeUser } = user
  return NextResponse.json(safeUser, { status: 201 })
}
