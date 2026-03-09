import { NextResponse } from "next/server"
import { authenticateUser, issueJwtForUser } from "@/lib/aetherscan/auth"
import { updateDatabase } from "@/lib/aetherscan/store"
import { makeId, nowIso } from "@/lib/aetherscan/utils"

const SESSION_HOURS = 12

export async function POST(request: Request) {
  const body = await request.json()
  const email = String(body.email ?? "")
  const password = String(body.password ?? "")

  const user = await authenticateUser(email, password)
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }

  const token = issueJwtForUser(user, SESSION_HOURS)
  const issuedAt = nowIso()
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString()

  await updateDatabase((database) => {
    const candidate = database.users.find((entry) => entry.id === user.id)
    if (candidate) candidate.lastLoginAt = issuedAt
    database.sessions.push({
      id: makeId("session"),
      token,
      userId: user.id,
      createdAt: issuedAt,
      expiresAt,
      lastSeenAt: issuedAt,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    })
  })

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  })
}
