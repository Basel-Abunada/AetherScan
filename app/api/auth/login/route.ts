import { NextResponse } from "next/server"
import { authenticateUser, issueJwtForUser } from "@/lib/aetherscan/auth"
import { updateDatabase } from "@/lib/aetherscan/store"
import { nowIso } from "@/lib/aetherscan/utils"

export async function POST(request: Request) {
  const body = await request.json()
  const email = String(body.email ?? "")
  const password = String(body.password ?? "")

  const user = await authenticateUser(email, password)
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }

  const token = issueJwtForUser(user)
  const issuedAt = nowIso()

  await updateDatabase((database) => {
    const candidate = database.users.find((entry) => entry.id === user.id)
    if (candidate) candidate.lastLoginAt = issuedAt
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
