import { NextResponse } from "next/server"
import { requireUser } from "@/lib/aetherscan/auth"

export async function GET(request: Request) {
  const { user, response } = await requireUser(request)
  if (!user) return response
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role })
}
