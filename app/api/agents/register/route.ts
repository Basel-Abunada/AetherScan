import { NextResponse } from "next/server"
import { requireUserRole } from "@/lib/aetherscan/auth"
import { updateDatabase } from "@/lib/aetherscan/store"
import { makeId, nowIso } from "@/lib/aetherscan/utils"

export async function POST(request: Request) {
  const auth = await requireUserRole(request, ["admin"])
  if (!auth.user) return auth.response
  const body = await request.json()

  const agent = {
    id: makeId("agent"),
    name: String(body.name ?? "New Agent"),
    hostname: String(body.hostname ?? "agent-host"),
    ipAddress: String(body.ipAddress ?? "127.0.0.1"),
    platform: String(body.platform ?? "Unknown"),
    description: String(body.description ?? ""),
    status: "offline" as const,
    lastSeenAt: nowIso(),
    mode: body.mode === "live" ? "live" : "demo",
    authToken: makeId("agenttoken"),
    targetHint: body.targetHint ? String(body.targetHint) : undefined,
  }

  await updateDatabase((database) => {
    database.agents.push(agent)
  })

  return NextResponse.json(agent, { status: 201 })
}
