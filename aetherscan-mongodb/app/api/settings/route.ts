import { NextResponse } from "next/server"
import { requireUser } from "@/lib/aetherscan/auth"
import { readDatabase, updateDatabase } from "@/lib/aetherscan/store"

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response
  const database = await readDatabase()

  return NextResponse.json({
    profile: {
      name: auth.user.name,
      email: auth.user.email,
      role: auth.user.role,
      department: auth.user.department ?? "",
      theme: auth.user.theme ?? "system",
      timezone: auth.user.timezone ?? "Asia/Kuala_Lumpur",
    },
    notifications: database.settings.notifications,
    email: database.settings.email,
    system: database.settings.system,
  })
}

export async function PATCH(request: Request) {
  const auth = await requireUser(request)
  if (!auth.user) return auth.response
  const body = await request.json()

  const payload = await updateDatabase((database) => {
    const user = database.users.find((entry) => entry.id === auth.user?.id)
    if (!user) return null

    if (body.profile) {
      if (body.profile.name) user.name = String(body.profile.name)
      if (auth.user?.role === "admin" && body.profile.email) user.email = String(body.profile.email).toLowerCase()
      if (body.profile.department !== undefined) user.department = String(body.profile.department)
      if (["light", "dark", "system"].includes(body.profile.theme)) user.theme = body.profile.theme
      if (body.profile.timezone) user.timezone = String(body.profile.timezone)
    }

    if (auth.user?.role === "admin") {
      if (body.notifications) {
        database.settings.notifications = {
          ...database.settings.notifications,
          ...body.notifications,
          alertEmail: String(body.notifications.alertEmail ?? database.settings.notifications.alertEmail ?? ""),
          ccEmail: String(body.notifications.ccEmail ?? database.settings.notifications.ccEmail ?? ""),
        }
      }

      if (body.email) {
        database.settings.email = {
          ...database.settings.email,
          ...body.email,
          host: String(body.email.host ?? database.settings.email.host ?? ""),
          port: Number(body.email.port ?? database.settings.email.port ?? 587),
          secure: Boolean(body.email.secure ?? database.settings.email.secure),
          username: String(body.email.username ?? database.settings.email.username ?? ""),
          password: String(body.email.password ?? database.settings.email.password ?? ""),
          from: String(body.email.from ?? database.settings.email.from ?? ""),
        }
      }

      if (body.system) {
        database.settings.system = {
          ...database.settings.system,
          ...body.system,
          defaultScanType: ["quick", "standard", "full", "vuln"].includes(body.system.defaultScanType) ? body.system.defaultScanType : database.settings.system.defaultScanType,
          autoGenerateReports: Boolean(body.system.autoGenerateReports ?? database.settings.system.autoGenerateReports),
          dataRetentionDays: Math.max(1, Math.min(365, Number(body.system.dataRetentionDays ?? database.settings.system.dataRetentionDays) || database.settings.system.dataRetentionDays)),
        }
      }
    }

    return {
      profile: {
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department ?? "",
        theme: user.theme ?? "system",
        timezone: user.timezone ?? "Asia/Kuala_Lumpur",
      },
      notifications: database.settings.notifications,
      email: database.settings.email,
      system: database.settings.system,
    }
  })

  if (!payload) return NextResponse.json({ error: "User not found" }, { status: 404 })
  return NextResponse.json(payload)
}
