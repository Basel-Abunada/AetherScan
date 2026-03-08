import { NextResponse } from "next/server"
import { requireUserRole } from "@/lib/aetherscan/auth"
import { updateDatabase } from "@/lib/aetherscan/store"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUserRole(request, ["admin", "engineer"])
  if (!auth.user) return auth.response
  const { id } = await params
  const body = await request.json()

  const schedule = await updateDatabase((database) => {
    const candidate = database.schedules.find((entry) => entry.id === id)
    if (!candidate) return null
    if (body.name) candidate.name = String(body.name)
    if (body.frequency) candidate.frequency = String(body.frequency)
    if (body.startTime) candidate.startTime = String(body.startTime)
    if (body.target) candidate.target = String(body.target)
    if (body.scanType && ["quick", "standard", "full", "vuln"].includes(body.scanType)) candidate.scanType = body.scanType
    if (body.status && ["active", "paused", "disabled"].includes(body.status)) candidate.status = body.status
    return candidate
  })

  if (!schedule) return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
  return NextResponse.json(schedule)
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireUserRole(request, ["admin", "engineer"])
  if (!auth.user) return auth.response
  const { id } = await params
  const removed = await updateDatabase((database) => {
    const index = database.schedules.findIndex((entry) => entry.id === id)
    if (index < 0) return false
    database.schedules.splice(index, 1)
    return true
  })

  if (!removed) return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
