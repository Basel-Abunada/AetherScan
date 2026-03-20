import { NextResponse } from "next/server"
import { canAccessFinding } from "@/lib/aetherscan/access"
import { requireUser, requireUserRole } from "@/lib/aetherscan/auth"
import { readDatabase, updateDatabase } from "@/lib/aetherscan/store"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response
  const { id } = await params
  const body = await request.json()
  const database = await readDatabase()
  if (!canAccessFinding(database, auth.user, id)) {
    return NextResponse.json({ error: "Finding not found" }, { status: 404 })
  }

  const finding = await updateDatabase((database) => {
    const candidate = database.findings.find((entry) => entry.id === id)
    if (!candidate) return null
    if (body.status && ["open", "in-progress", "resolved"].includes(body.status)) candidate.status = body.status
    return candidate
  })

  if (!finding) return NextResponse.json({ error: "Finding not found" }, { status: 404 })
  return NextResponse.json(finding)
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireUserRole(request, ["admin"])
  if (!auth.user) return auth.response
  const { id } = await params

  const removed = await updateDatabase((database) => {
    const finding = database.findings.find((entry) => entry.id === id)
    if (!finding) return false

    const findingTitle = finding.title.toLowerCase()
    const findingService = finding.service.toLowerCase()
    const findingPort = `${finding.port}`
    const findingCve = finding.cve?.toLowerCase()

    database.findings = database.findings.filter((entry) => entry.id !== id)
    database.alerts = database.alerts.filter((alert) => {
      const alertTitle = alert.title.toLowerCase()
      const alertMessage = alert.message.toLowerCase()
      const sameAssetScan = alert.scanId === finding.scanId && alert.assetId === finding.assetId
      const mentionsTitle = alertTitle.includes(findingTitle) || alertMessage.includes(findingTitle)
      const mentionsService = alertMessage.includes(`${findingService}/${findingPort}`) || alertMessage.includes(`${findingService} on port ${findingPort}`)
      const mentionsCve = findingCve ? alertTitle.includes(findingCve) || alertMessage.includes(findingCve) : false
      const mentionsAsset = alert.assetId === finding.assetId || alertMessage.includes(finding.assetId.toLowerCase())
      const legacyRiskAlert = alertTitle.startsWith("high risk detected") || alertTitle.startsWith("medium risk detected") || alertTitle.startsWith("high finding:") || alertTitle.startsWith("medium finding:")

      if (alert.findingId === id) return false
      if (sameAssetScan && (mentionsTitle || mentionsService || mentionsCve || mentionsAsset)) return false
      if (legacyRiskAlert && mentionsAsset && (mentionsTitle || mentionsService || mentionsCve)) return false
      return true
    })

    return true
  })

  if (!removed) return NextResponse.json({ error: "Finding not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}


