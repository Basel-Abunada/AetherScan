import { NextResponse } from "next/server"
import { requireUserRole } from "@/lib/aetherscan/auth"
import { updateDatabase } from "@/lib/aetherscan/store"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUserRole(request, ["admin"])
  if (!auth.user) return auth.response
  const { id } = await params
  const body = await request.json()

  const user = await updateDatabase((database) => {
    const candidate = database.users.find((entry) => entry.id === id)
    if (!candidate) return null
    if (body.name) candidate.name = String(body.name)
    if (body.email) candidate.email = String(body.email).toLowerCase()
    if (body.role && ["admin", "engineer", "technician"].includes(body.role)) candidate.role = body.role
    if (body.status && ["active", "inactive"].includes(body.status)) candidate.status = body.status
    const { passwordHash: _passwordHash, ...safeUser } = candidate
    return safeUser
  })

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
  return NextResponse.json(user)
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireUserRole(request, ["admin"])
  if (!auth.user) return auth.response
  const { id } = await params
  const removed = await updateDatabase((database) => {
    const index = database.users.findIndex((entry) => entry.id === id)
    if (index < 0) return false
    database.users.splice(index, 1)
    return true
  })

  if (!removed) return NextResponse.json({ error: "User not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
