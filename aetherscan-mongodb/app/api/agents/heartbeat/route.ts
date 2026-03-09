import { NextResponse } from "next/server"
import { requireAgent } from "@/lib/aetherscan/auth"
import { updateDatabase } from "@/lib/aetherscan/store"
import { nowIso } from "@/lib/aetherscan/utils"

export async function POST(request: Request) {
  const auth = await requireAgent(request)
  if (!auth.agent) return auth.response
  const body = await request.json().catch(() => ({}))

  const agent = await updateDatabase((database) => {
    const candidate = database.agents.find((entry) => entry.id === auth.agent?.id)
    if (!candidate) return null
    candidate.lastSeenAt = nowIso()
    candidate.status = body.status && ["online", "offline", "degraded", "occupied"].includes(body.status) ? body.status : "online"
    if (body.ipAddress) candidate.ipAddress = String(body.ipAddress)
    if (body.platform) candidate.platform = String(body.platform)
    return candidate
  })

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  return NextResponse.json({ ok: true, agentId: agent.id })
}
