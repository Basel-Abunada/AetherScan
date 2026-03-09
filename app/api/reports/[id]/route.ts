import { NextResponse } from "next/server"
import { requireUserRole } from "@/lib/aetherscan/auth"
import { updateDatabase } from "@/lib/aetherscan/store"

type Params = { params: Promise<{ id: string }> }

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireUserRole(request, ["admin"])
  if (!auth.user) return auth.response
  const { id } = await params

  const removed = await updateDatabase((database) => {
    const exists = database.reports.some((entry) => entry.id === id)
    if (!exists) return false
    database.reports = database.reports.filter((entry) => entry.id !== id)
    return true
  })

  if (!removed) return NextResponse.json({ error: "Report not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
