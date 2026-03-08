import type { DemoDatabase } from "@/lib/aetherscan/types"
import { hashPassword, nowIso } from "@/lib/aetherscan/utils"

export function createSeedDatabase(): DemoDatabase {
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
      },
      {
        id: "user_engineer",
        name: "Network Engineer",
        email: "engineer@aetherscan.local",
        passwordHash: hashPassword("Engineer123!"),
        role: "engineer",
        status: "active",
        createdAt,
      },
      {
        id: "user_tech",
        name: "Security Technician",
        email: "tech@aetherscan.local",
        passwordHash: hashPassword("Tech123!"),
        role: "technician",
        status: "active",
        createdAt,
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
  }
}
