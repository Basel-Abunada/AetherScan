import nodemailer from "nodemailer"
import type { AetherScanDatabase } from "@/lib/aetherscan/types"

function notificationRecipients(database: AetherScanDatabase) {
  const primary = database.settings.notifications.alertEmail.trim()
  const cc = database.settings.notifications.ccEmail.trim()
  return {
    to: primary || database.users.find((user) => user.role === "admin")?.email || "",
    cc: cc || undefined,
  }
}

export function emailConfigured(database: AetherScanDatabase) {
  const settings = database.settings
  return Boolean(
    settings.notifications.emailEnabled &&
    settings.email.host &&
    settings.email.port &&
    settings.email.from &&
    notificationRecipients(database).to,
  )
}

export async function sendNotificationEmail(database: AetherScanDatabase, input: { subject: string; text: string; html?: string }) {
  if (!emailConfigured(database)) {
    return { ok: false, reason: "Email notifications are not configured" }
  }

  const transporter = nodemailer.createTransport({
    host: database.settings.email.host,
    port: database.settings.email.port,
    secure: database.settings.email.secure,
    auth: database.settings.email.username
      ? {
          user: database.settings.email.username,
          pass: database.settings.email.password,
        }
      : undefined,
  })

  const recipients = notificationRecipients(database)

  await transporter.sendMail({
    from: database.settings.email.from,
    to: recipients.to,
    cc: recipients.cc,
    subject: input.subject,
    text: input.text,
    html: input.html,
  })

  return { ok: true }
}
