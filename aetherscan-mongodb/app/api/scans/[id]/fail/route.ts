import { NextResponse } from "next/server"
import { requireAgent } from "@/lib/aetherscan/auth"
import { failScan } from "@/lib/aetherscan/scan-service"
import { updateDatabase } from "@/lib/aetherscan/store"
import { makeId, nowIso } from "@/lib/aetherscan/utils"

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAgent(request)
  if (!auth.agent) return auth.response
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const message = typeof body.message === "string" && body.message.trim() ? body.message.trim() : "Agent reported a scan failure"

  const scan = await updateDatabase((database) => {
    const failed = failScan(database, id, message)
    if (!failed) return null

    const agent = database.agents.find((entry) => entry.id === auth.agent?.id)
    if (agent) {
      agent.status = "online"
      agent.lastSeenAt = nowIso()
      if (body.platform) agent.platform = String(body.platform)
    }

    database.alerts.unshift({
      id: makeId("alert"),
      severity: "medium",
      title: `Scan failed: ${failed.target}`,
      message,
      createdAt: nowIso(),
      acknowledged: false,
      category: "system",
      scanId: failed.id,
    })

    return failed
  })

  if (!scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 })
  return NextResponse.json({ failedScan: scan })
}
