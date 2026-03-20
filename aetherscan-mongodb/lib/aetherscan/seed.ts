import type { AetherScanDatabase, AetherScanSettings } from "@/lib/aetherscan/types"
import { hashPassword, nowIso } from "@/lib/aetherscan/utils"

export function createDefaultSettings(): AetherScanSettings {
  return {
    notifications: {
      emailEnabled: false,
      highRiskAlerts: true,
      scanCompletion: true,
      agentOffline: true,
      weeklySummary: false,
      alertEmail: "",
      ccEmail: "",
    },
    email: {
      host: "",
      port: 587,
      secure: false,
      username: "",
      password: "",
      from: "",
    },
    system: {
      defaultScanType: "standard",
      autoGenerateReports: true,
      dataRetentionDays: 90,
    },
  }
}

export function createSeedDatabase(): AetherScanDatabase {
  const createdAt = nowIso()
  return {
    users: [
      {
        id: "user_admin",
        name: "System Administrator",
        email: "admin@aetherscan.local",
        passwordHash: hashPassword("Admin123!"),
        role: "admin",
        status: "active",
        createdAt,
        lastLoginAt: createdAt,
        department: "Cybersecurity",
        theme: "system",
        language: "en",
        timezone: "Asia/Kuala_Lumpur",
        notificationSettings: createDefaultSettings().notifications,
        emailSettings: createDefaultSettings().email,
        systemSettings: createDefaultSettings().system,
      },
      {
        id: "user_engineer",
        name: "Network Engineer",
        email: "engineer@aetherscan.local",
        passwordHash: hashPassword("Engineer123!"),
        role: "engineer",
        status: "active",
        createdAt,
        department: "Network Operations",
        theme: "system",
        language: "en",
        timezone: "Asia/Kuala_Lumpur",
        notificationSettings: createDefaultSettings().notifications,
        emailSettings: createDefaultSettings().email,
        systemSettings: createDefaultSettings().system,
      },
      {
        id: "user_tech",
        name: "Security Technician",
        email: "tech@aetherscan.local",
        passwordHash: hashPassword("Tech123!"),
        role: "technician",
        status: "active",
        createdAt,
        department: "Security Operations",
        theme: "system",
        language: "en",
        timezone: "Asia/Kuala_Lumpur",
        notificationSettings: createDefaultSettings().notifications,
        emailSettings: createDefaultSettings().email,
        systemSettings: createDefaultSettings().system,
      },
    ],
    sessions: [],
    agents: [],
    schedules: [],
    assets: [],
    findings: [],
    alerts: [],
    scans: [],
    reports: [],
    settings: createDefaultSettings(),
  }
}
