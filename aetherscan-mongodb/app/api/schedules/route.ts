import { NextResponse } from "next/server"
import { requireUserRole } from "@/lib/aetherscan/auth"
import { readDatabase, updateDatabase } from "@/lib/aetherscan/store"
import { addHours, makeId } from "@/lib/aetherscan/utils"

export async function GET(request: Request) {
  const auth = await requireUserRole(request, ["admin", "engineer"])
  if (!auth.user) return auth.response
  const database = await readDatabase()
  return NextResponse.json(database.schedules)
}

export async function POST(request: Request) {
  const auth = await requireUserRole(request, ["admin", "engineer"])
  if (!auth.user) return auth.response

  const body = await request.json()
  const schedule = {
    id: makeId("schedule"),
    name: String(body.name ?? "New Schedule"),
    agentId: String(body.agentId ?? ""),
    target: String(body.target ?? "").trim(),
    frequency: String(body.frequency ?? "Daily"),
    startTime: String(body.startTime ?? "02:00"),
    nextRunAt: addHours(new Date(), 6).toISOString(),
    lastRunAt: undefined,
    status: "active" as const,
    scanType: body.scanType === "quick" || body.scanType === "standard" || body.scanType === "full" || body.scanType === "vuln" ? body.scanType : "standard",
    mode: "live" as const,
  }

  if (!schedule.agentId || !schedule.target) {
    return NextResponse.json({ error: "Agent and target are required" }, { status: 400 })
  }

  await updateDatabase((database) => {
    database.schedules.push(schedule)
  })

  return NextResponse.json(schedule, { status: 201 })
}
