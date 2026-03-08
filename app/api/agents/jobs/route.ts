import { NextResponse } from "next/server"
import { requireAgent } from "@/lib/aetherscan/auth"
import { createQueuedScan, markScanRunning } from "@/lib/aetherscan/scan-service"
import { updateDatabase } from "@/lib/aetherscan/store"
import { addHours } from "@/lib/aetherscan/utils"

function nextRunDate(current: string, frequency: string) {
  const base = new Date(current)
  switch (frequency.toLowerCase()) {
    case "hourly":
      return addHours(base, 1).toISOString()
    case "every 6 hours":
      return addHours(base, 6).toISOString()
    case "weekly":
      return addHours(base, 24 * 7).toISOString()
    default:
      return addHours(base, 24).toISOString()
  }
}

export async function GET(request: Request) {
  const auth = await requireAgent(request)
  if (!auth.agent) return auth.response

  const job = await updateDatabase((database) => {
    const queued = database.scans.find((scan) => scan.agentId === auth.agent?.id && scan.status === "queued")
    if (queued) {
      markScanRunning(database, queued.id)
      return queued
    }

    const dueSchedule = database.schedules.find((schedule) =>
      schedule.agentId === auth.agent?.id &&
      schedule.status === "active" &&
      new Date(schedule.nextRunAt).getTime() <= Date.now(),
    )

    if (!dueSchedule || !auth.agent) return null

    const queuedFromSchedule = createQueuedScan(database, {
      agentId: auth.agent.id,
      agentName: auth.agent.name,
      target: dueSchedule.target,
      scanType: dueSchedule.scanType,
      mode: dueSchedule.mode,
    })
    dueSchedule.lastRunAt = queuedFromSchedule.startedAt
    dueSchedule.nextRunAt = nextRunDate(dueSchedule.nextRunAt, dueSchedule.frequency)
    markScanRunning(database, queuedFromSchedule.id)
    return queuedFromSchedule
  })

  return NextResponse.json({ job })
}
