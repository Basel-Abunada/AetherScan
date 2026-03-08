import { NextResponse } from "next/server"
import { requireUserRole } from "@/lib/aetherscan/auth"
import { sendNotificationEmail } from "@/lib/aetherscan/email"
import { readDatabase } from "@/lib/aetherscan/store"

export async function POST(request: Request) {
  const auth = await requireUserRole(request, ["admin"])
  if (!auth.user) return auth.response
  const database = await readDatabase()

  try {
    const result = await sendNotificationEmail(database, {
      subject: "AetherScan test email",
      text: `This is a test notification sent by ${auth.user.name} from the AetherScan settings page.`,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send test email" }, { status: 500 })
  }
}
