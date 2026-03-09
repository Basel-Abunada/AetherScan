import { NextResponse } from "next/server"
import { requireUser, requireUserRole } from "@/lib/aetherscan/auth"
import { updateDatabase } from "@/lib/aetherscan/store"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response
  const { id } = await params
  const body = await request.json()

  const finding = await updateDatabase((database) => {
    const candidate = database.findings.find((entry) => entry.id === id)
    if (!candidate) return null
    if (body.status && ["open", "in-progress", "resolved"].includes(body.status)) candidate.status = body.status
    return candidate
  })

  if (!finding) return NextResponse.json({ error: "Finding not found" }, { status: 404 })
  return NextResponse.json(finding)
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireUserRole(request, ["admin"])
  if (!auth.user) return auth.response
  const { id } = await params

  const removed = await updateDatabase((database) => {
    const finding = database.findings.find((entry) => entry.id === id)
    if (!finding) return false

    database.findings = database.findings.filter((entry) => entry.id !== id)
    database.alerts = database.alerts.filter((alert) => {
      if (alert.findingId === id) return false
      if (alert.scanId === finding.scanId && alert.assetId === finding.assetId && alert.title.toLowerCase().includes(finding.title.toLowerCase())) return false
      if (alert.message.toLowerCase().includes(finding.title.toLowerCase()) && alert.message.includes(`${finding.service}/${finding.port}`)) return false
      return true
    })

    return true
  })

  if (!removed) return NextResponse.json({ error: "Finding not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
