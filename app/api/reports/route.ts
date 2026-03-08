import { NextResponse } from "next/server"
import { requireUser } from "@/lib/aetherscan/auth"
import { buildReportContent } from "@/lib/aetherscan/reports"
import { readDatabase, updateDatabase } from "@/lib/aetherscan/store"
import { makeId, nowIso } from "@/lib/aetherscan/utils"

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response
  const database = await readDatabase()
  return NextResponse.json(database.reports.slice().reverse())
}

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response

  const body = await request.json()
  const database = await readDatabase()
  const type = body.type === "scan" || body.type === "vulnerability" || body.type === "asset" || body.type === "executive" ? body.type : "executive"
  const format = body.format === "csv" ? "csv" : "pdf"
  const content = buildReportContent({ type, format, scans: database.scans, findings: database.findings, assets: database.assets })
  const id = makeId("report")
  const fileName = `${id}.${format}`
  const generatedAt = nowIso()

  const record = {
    id,
    name: `AetherScan ${type} report`,
    type,
    format,
    generatedAt,
    generatedBy: String(body.generatedBy ?? auth.user.name),
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
