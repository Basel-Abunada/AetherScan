import { createHash, randomBytes } from "node:crypto"

export function nowIso() {
  return new Date().toISOString()
}

export function makeId(prefix: string) {
  return `${prefix}_${randomBytes(5).toString("hex")}`
}

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex")
}

export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

export function toCsvRow(values: Array<string | number | boolean | undefined>) {
  return values
    .map((value) => {
      const stringValue = String(value ?? "")
      if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
    .join(",")
}
