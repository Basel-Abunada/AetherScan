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

function ipToInt(ip: string) {
  const octets = ip.split(".").map((segment) => Number(segment))
  if (octets.length !== 4 || octets.some((segment) => !Number.isInteger(segment) || segment < 0 || segment > 255)) {
    return null
  }
  return (((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3]) >>> 0
}

function intToIp(value: number) {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join(".")
}

export function normalizeScanTarget(target: string) {
  const trimmed = target.trim()
  const rangeMatch = trimmed.match(/^(\d+\.\d+\.\d+\.\d+)\s*-\s*(\d+\.\d+\.\d+\.\d+)$/)
  if (!rangeMatch) return trimmed

  const start = ipToInt(rangeMatch[1])
  const end = ipToInt(rangeMatch[2])
  if (start === null || end === null || end < start) return trimmed

  const totalHosts = end - start + 1
  if (totalHosts > 1024) return trimmed

  const startOctets = rangeMatch[1].split(".")
  const endOctets = rangeMatch[2].split(".")
  if (startOctets.slice(0, 3).join(".") === endOctets.slice(0, 3).join(".")) {
    return `${rangeMatch[1]}-${endOctets[3]}`
  }

  return Array.from({ length: totalHosts }, (_, index) => intToIp(start + index)).join(" ")
}
