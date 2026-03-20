import nodemailer from "nodemailer"
import type { AetherScanDatabase, User } from "@/lib/aetherscan/types"

function notificationRecipients(user: User) {
  const primary = user.notificationSettings?.alertEmail?.trim() || user.email
  const cc = user.notificationSettings?.ccEmail?.trim()
  return {
    to: primary,
    cc: cc || undefined,
  }
}

function resolveEmailSettings(database: AetherScanDatabase, user: User) {
  return user.emailSettings ?? database.settings.email
}

export function emailConfiguredForUser(database: AetherScanDatabase, user: User) {
  const emailSettings = resolveEmailSettings(database, user)
  const recipients = notificationRecipients(user)
  return Boolean(
    user.notificationSettings?.emailEnabled &&
    emailSettings.host &&
    emailSettings.port &&
    emailSettings.from &&
    recipients.to,
  )
}

export async function sendNotificationEmailToUser(database: AetherScanDatabase, userId: string, input: { subject: string; text: string; html?: string }) {
  const user = database.users.find((entry) => entry.id === userId)
  if (!user) {
    return { ok: false, reason: "User not found" }
  }

  if (!emailConfiguredForUser(database, user)) {
    return { ok: false, reason: "Email notifications are not configured for this user" }
  }

  const emailSettings = resolveEmailSettings(database, user)
  const recipients = notificationRecipients(user)
  const transporter = nodemailer.createTransport({
    host: emailSettings.host,
    port: emailSettings.port,
    secure: emailSettings.secure,
    auth: emailSettings.username
      ? {
          user: emailSettings.username,
          pass: emailSettings.password,
        }
      : undefined,
  })

  await transporter.sendMail({
    from: emailSettings.from,
    to: recipients.to,
    cc: recipients.cc,
    subject: input.subject,
    text: input.text,
    html: input.html,
  })

  return { ok: true }
}

export async function sendNotificationEmailToUsers(database: AetherScanDatabase, userIds: string[], input: { subject: string; text: string; html?: string }) {
  const uniqueUserIds = [...new Set(userIds)]
  const results = await Promise.all(uniqueUserIds.map((userId) => sendNotificationEmailToUser(database, userId, input).catch((error) => ({ ok: false, reason: error instanceof Error ? error.message : "Failed to send email" }))))
  return {
    ok: results.some((result) => result.ok),
    results,
  }
}
