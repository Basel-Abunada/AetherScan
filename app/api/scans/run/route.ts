import { NextResponse } from "next/server"
import { requireUserRole } from "@/lib/aetherscan/auth"
import { createQueuedScan } from "@/lib/aetherscan/scan-service"
import { updateDatabase } from "@/lib/aetherscan/store"

export async function POST(request: Request) {
  const auth = await requireUserRole(request, ["admin", "engineer", "technician"])
  if (!auth.user) return auth.response

  const body = await request.json()
  const mode = body.mode === "live" ? "live" : "live"
  const scanType = body.scanType === "quick" || body.scanType === "standard" || body.scanType === "full" || body.scanType === "vuln" ? body.scanType : "standard"
  const agentId = String(body.agentId ?? "")
  const target = String(body.target ?? "")

  if (!agentId || !target) {
    return NextResponse.json({ error: "Agent and target are required" }, { status: 400 })
  }

  const queuedScan = await updateDatabase((database) => {
    const agent = database.agents.find((entry) => entry.id === agentId)
    if (!agent) return null
    return createQueuedScan(database, {
      agentId,
      agentName: agent.name,
      target,
      scanType,
      mode,
    })
  })

  if (!queuedScan) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  }

  return NextResponse.json({ queuedScan })
}
