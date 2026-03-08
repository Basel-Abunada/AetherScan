import type {
  Asset,
  ReportFormat,
  ReportType,
  RiskFinding,
  ScanResult,
} from "@/lib/aetherscan/types"
import { toCsvRow } from "@/lib/aetherscan/utils"

function buildPdfText(lines: string[]) {
  const text = lines.join("\\n").replace(/[()\\]/g, "\\$&")
  const stream = `BT /F1 10 Tf 50 780 Td (${text}) Tj ET`
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj",
  ]

  let pdf = "%PDF-1.4\n"
  const offsets = [0]
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"))
    pdf += `${object}\n`
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8")
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(pdf, "utf8")
}

export function buildReportContent({
  type,
  format,
  scans,
  findings,
  assets,
}: {
  type: ReportType
  format: ReportFormat
  scans: ScanResult[]
  findings: RiskFinding[]
  assets: Asset[]
}) {
  if (format === "csv") {
    if (type === "asset") {
      const rows = [
        toCsvRow(["IP", "Hostname", "OS", "Status", "Services"]),
        ...assets.map((asset) =>
          toCsvRow([
            asset.ipAddress,
            asset.hostname,
            asset.os,
            asset.status,
            asset.services.map((service) => `${service.port}/${service.name}`).join(" | "),
          ]),
        ),
      ]
      return Buffer.from(rows.join("\n"), "utf8")
    }

    if (type === "scan") {
      const rows = [
        toCsvRow(["Scan ID", "Agent", "Target", "Type", "Status", "High", "Medium", "Low"]),
        ...scans.map((scan) =>
          toCsvRow([
            scan.id,
            scan.agentName,
            scan.target,
            scan.scanType,
            scan.status,
            scan.vulnerabilities.high,
            scan.vulnerabilities.medium,
            scan.vulnerabilities.low,
          ]),
        ),
      ]
      return Buffer.from(rows.join("\n"), "utf8")
    }

    const rows = [
      toCsvRow(["Title", "Host Asset ID", "Service", "Port", "Risk", "Status", "CVE"]),
      ...findings.map((finding) =>
        toCsvRow([
          finding.title,
          finding.assetId,
          finding.service,
          finding.port,
          finding.riskLevel,
          finding.status,
          finding.cve,
        ]),
      ),
    ]
    return Buffer.from(rows.join("\n"), "utf8")
  }

  const lines = [
    "AetherScan Demo Report",
    `Type: ${type}`,
    `Generated scans: ${scans.length}`,
    `Tracked assets: ${assets.length}`,
    `Open findings: ${findings.filter((finding) => finding.status !== "resolved").length}`,
    "",
    "Top findings:",
    ...findings.slice(0, 12).map(
      (finding) =>
        `${finding.riskLevel.toUpperCase()} ${finding.title} on port ${finding.port} (${finding.service})`,
    ),
  ]
  return buildPdfText(lines)
}
