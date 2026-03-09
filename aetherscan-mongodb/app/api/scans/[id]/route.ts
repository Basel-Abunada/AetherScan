import { NextResponse } from "next/server"
import { requireUserRole } from "@/lib/aetherscan/auth"
import { updateDatabase } from "@/lib/aetherscan/store"

type Params = { params: Promise<{ id: string }> }

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireUserRole(request, ["admin"])
  if (!auth.user) return auth.response
  const { id } = await params

  const removed = await updateDatabase((database) => {
    const scan = database.scans.find((entry) => entry.id === id)
    if (!scan) return false
    database.scans = database.scans.filter((entry) => entry.id !== id)
    database.findings = database.findings.filter((finding) => finding.scanId !== id)
    database.assets = database.assets.filter((asset) => !scan.assetIds.includes(asset.id))
    database.alerts = database.alerts.filter((alert) => alert.scanId !== id)
    database.reports = database.reports.filter((report) => !report.name.includes(scan.id))
    return true
  })

  if (!removed) return NextResponse.json({ error: "Scan result not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
