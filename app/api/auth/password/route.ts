import { NextResponse } from "next/server"
import { requireUser } from "@/lib/aetherscan/auth"
import { updateDatabase } from "@/lib/aetherscan/store"
import { hashPassword } from "@/lib/aetherscan/utils"

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response
  const body = await request.json()
  const currentPassword = String(body.currentPassword ?? "")
  const newPassword = String(body.newPassword ?? "")

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 })
  }

  if (auth.user.passwordHash !== hashPassword(currentPassword)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
  }

  await updateDatabase((database) => {
    const user = database.users.find((entry) => entry.id === auth.user?.id)
    if (!user) return
    user.passwordHash = hashPassword(newPassword)
    database.sessions = database.sessions.filter((session) => session.userId !== user.id)
  })

  return NextResponse.json({ ok: true })
}
