import { NextResponse } from "next/server"
import { requireUserRole } from "@/lib/aetherscan/auth"
import { updateDatabase } from "@/lib/aetherscan/store"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUserRole(request, ["admin", "engineer"])
  if (!auth.user) return auth.response
  const { id } = await params
  const body = await request.json()

  const agent = await updateDatabase((database) => {
    const candidate = database.agents.find((entry) => entry.id === id)
    if (!candidate) return null
    if (body.name !== undefined) candidate.name = String(body.name)
    if (body.hostname !== undefined) candidate.hostname = String(body.hostname)
    if (body.ipAddress !== undefined) candidate.ipAddress = String(body.ipAddress)
    if (body.platform !== undefined) candidate.platform = String(body.platform)
    if (body.description !== undefined) candidate.description = String(body.description)
    if (body.targetHint !== undefined) candidate.targetHint = body.targetHint ? String(body.targetHint) : undefined
    if (body.status && ["online", "offline", "degraded"].includes(body.status)) candidate.status = body.status
    const { authToken: _authToken, ...safeAgent } = candidate
    return safeAgent
  })

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  return NextResponse.json(agent)
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireUserRole(request, ["admin", "engineer"])
  if (!auth.user) return auth.response
  const { id } = await params

  const removed = await updateDatabase((database) => {
    const index = database.agents.findIndex((entry) => entry.id === id)
    if (index < 0) return false
    database.agents.splice(index, 1)
    database.schedules = database.schedules.filter((schedule) => schedule.agentId !== id)
    return true
  })

  if (!removed) return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
