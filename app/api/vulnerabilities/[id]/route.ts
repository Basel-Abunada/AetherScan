import { NextResponse } from "next/server"
import { requireUser } from "@/lib/aetherscan/auth"
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
