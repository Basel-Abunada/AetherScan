import { NextResponse } from "next/server"
import { getVisibleReports, getVisibleScans, getVisibleFindings, getVisibleAssets } from "@/lib/aetherscan/access"
import { requireUser } from "@/lib/aetherscan/auth"
import { buildReportContent } from "@/lib/aetherscan/reports"
import { readDatabase, updateDatabase } from "@/lib/aetherscan/store"
import { makeId, nowIso } from "@/lib/aetherscan/utils"

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response
  const database = await readDatabase()
  return NextResponse.json(getVisibleReports(database, auth.user).slice().reverse())
}

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response

  const body = await request.json()
  const database = await readDatabase()
  const type = body.type === "scan" || body.type === "vulnerability" || body.type === "asset" || body.type === "executive" ? body.type : "executive"
  const format = body.format === "csv" ? "csv" : "pdf"
  const visibleScans = getVisibleScans(database, auth.user)
  const visibleFindings = getVisibleFindings(database, auth.user)
  const visibleAssets = getVisibleAssets(database, auth.user)
  const content = buildReportContent({ type, format, scans: visibleScans, findings: visibleFindings, assets: visibleAssets })
  const id = makeId("report")
  const fileName = `${id}.${format}`
  const generatedAt = nowIso()

  const record: typeof database.reports[number] = {
    id,
    name: `AetherScan ${type} report`,
    type,
    format,
    generatedAt,
    generatedBy: String(body.generatedBy ?? auth.user.name),
    createdByUserId: auth.user.id,
    sizeBytes: content.length,
    downloadPath: `/api/reports/${id}/download`,
  }

  await updateDatabase((mutable) => {
    mutable.reports.push(record)
  })

  return new NextResponse(content, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "X-AetherScan-Report-Id": id,
    },
  })
}
