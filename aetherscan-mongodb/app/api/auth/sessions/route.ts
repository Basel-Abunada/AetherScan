import { NextResponse } from "next/server"
import { requireUser, extractBearerToken } from "@/lib/aetherscan/auth"
import { readDatabase, updateDatabase } from "@/lib/aetherscan/store"

type SessionScope = "current" | "others" | "all"

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response
  const token = extractBearerToken(request)
  const database = await readDatabase()
  const sessions = database.sessions
    .filter((session) => session.userId === auth.user?.id)
    .map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastSeenAt: session.lastSeenAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      current: session.token === token,
    }))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  return NextResponse.json({ sessions })
}

export async function DELETE(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response
  const token = extractBearerToken(request)
  const body = await request.json().catch(() => ({}))
  const scope = body.scope === "all" || body.scope === "current" ? body.scope : "others"

  await updateDatabase((database) => {
    database.sessions = database.sessions.filter((session) => {
      if (session.userId !== auth.user?.id) return true
      if (scope === "all") return false
      if (scope === "current") return session.token !== token
      return session.token === token
    })
  })

  return NextResponse.json({ ok: true, scope: scope as SessionScope })
}
