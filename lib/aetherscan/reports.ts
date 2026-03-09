import type {
  Asset,
  ReportFormat,
  ReportType,
  RiskFinding,
  ScanResult,
} from "@/lib/aetherscan/types"
import { toCsvRow } from "@/lib/aetherscan/utils"

const PDF_PAGE_WIDTH = 612
const PDF_PAGE_HEIGHT = 792
const PDF_MARGIN_X = 48
const PDF_START_Y = 744
const PDF_LINE_HEIGHT = 14
const PDF_LINES_PER_PAGE = 46
const PDF_TEXT_WIDTH = 82

type PdfSection = {
  heading: string
  lines: string[]
}

function escapePdfText(value: string) {
  return value.replace(/[()\\]/g, "\\$&")
}

function wrapLine(value: string, width = PDF_TEXT_WIDTH) {
  const words = value.split(/\s+/).filter(Boolean)
  if (!words.length) return [""]
  const lines: string[] = []
  let current = words[0]

  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`
    if (candidate.length <= width) {
      current = candidate
      continue
    }
    lines.push(current)
    current = word
  }

  lines.push(current)
  return lines
}

function flattenSections(sections: PdfSection[]) {
  const lines: string[] = []
  for (const section of sections) {
    lines.push(section.heading)
    for (const line of section.lines) {
      const wrapped = wrapLine(line)
      lines.push(...wrapped)
    }
    lines.push("")
  }
  return lines
}

function buildPdfDocument(title: string, sections: PdfSection[]) {
  const lines = flattenSections(sections)
  const pages: string[][] = []

  for (let index = 0; index < lines.length; index += PDF_LINES_PER_PAGE) {
    pages.push(lines.slice(index, index + PDF_LINES_PER_PAGE))
  }

  const objects: string[] = []
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj")

  const pageObjectNumbers: number[] = []
  let nextObjectNumber = 3
  for (let index = 0; index < pages.length; index += 1) {
    pageObjectNumbers.push(nextObjectNumber)
    nextObjectNumber += 2
  }

  objects.push(`2 0 obj << /Type /Pages /Kids [${pageObjectNumbers.map((page) => `${page} 0 R`).join(" ")}] /Count ${pages.length} >> endobj`)

  for (let index = 0; index < pages.length; index += 1) {
    const pageNumber = pageObjectNumbers[index]
    const contentNumber = pageNumber + 1
    const textLines = [title, "", ...pages[index]]
    const contentStream = [
      "BT",
      "/F1 10 Tf",
      `${PDF_LINE_HEIGHT} TL`,
      `${PDF_MARGIN_X} ${PDF_START_Y} Td`,
      ...textLines.map((line, lineIndex) => `${lineIndex === 0 ? "" : "T*\n"}(${escapePdfText(line)}) Tj`).join("\n").split("\n"),
      "ET",
    ].join("\n")

    objects.push(`${pageNumber} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Contents ${contentNumber} 0 R /Resources << /Font << /F1 ${nextObjectNumber} 0 R >> >> >> endobj`)
    objects.push(`${contentNumber} 0 obj << /Length ${Buffer.byteLength(contentStream, "utf8")} >> stream\n${contentStream}\nendstream endobj`)
  }

  objects.push(`${nextObjectNumber} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj`)

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

function summarizeCounts(findings: RiskFinding[]) {
  return findings.reduce(
    (acc, finding) => {
      acc[finding.riskLevel] += 1
      return acc
    },
    { high: 0, medium: 0, low: 0 },
  )
}

function activeAssets(assets: Asset[]) {
  return assets.filter((asset) => asset.status === "up")
}

function openFindings(findings: RiskFinding[]) {
  return findings.filter((finding) => finding.status !== "resolved")
}

function buildExecutiveSections(scans: ScanResult[], findings: RiskFinding[], assets: Asset[]): PdfSection[] {
  const open = openFindings(findings)
  const counts = summarizeCounts(open)
  const recentScans = scans.slice(-5).reverse()
  const topFindings = open.slice(0, 10)

  return [
    {
      heading: "Executive Summary",
      lines: [
        `Generated scans: ${scans.length}`,
        `Tracked assets: ${assets.length}`,
        `Active assets: ${activeAssets(assets).length}`,
        `Open findings: ${open.length}`,
        `High risk findings: ${counts.high}`,
        `Medium risk findings: ${counts.medium}`,
        `Low risk findings: ${counts.low}`,
      ],
    },
    {
      heading: "Recent Scan Activity",
      lines: recentScans.length
        ? recentScans.map((scan) => `${scan.id} | ${scan.agentName} | ${scan.target} | ${scan.status} | ${scan.scanType} | high ${scan.vulnerabilities.high}, medium ${scan.vulnerabilities.medium}, low ${scan.vulnerabilities.low}`)
        : ["No scan activity recorded."],
    },
    {
      heading: "Priority Findings",
      lines: topFindings.length
        ? topFindings.map((finding) => `${finding.riskLevel.toUpperCase()} | ${finding.title} | asset ${finding.assetId} | ${finding.service}/${finding.port} | status ${finding.status}`)
        : ["No active findings recorded."],
    },
  ]
}

function buildScanSections(scans: ScanResult[]): PdfSection[] {
  const recentScans = scans.slice().reverse().slice(0, 15)
  return [
    {
      heading: "Scan Operations Summary",
      lines: [
        `Total recorded scans: ${scans.length}`,
        `Completed scans: ${scans.filter((scan) => scan.status === "completed").length}`,
        `Running scans: ${scans.filter((scan) => scan.status === "running").length}`,
        `Failed scans: ${scans.filter((scan) => scan.status === "failed").length}`,
      ],
    },
    {
      heading: "Recent Scan Records",
      lines: recentScans.length
        ? recentScans.map((scan) => `${scan.id} | ${scan.agentName} | ${scan.target} | ${scan.scanType} | ${scan.status} | hosts ${scan.totalHosts} | duration ${scan.durationSeconds ?? 0}s | ${scan.summary}`)
        : ["No scan records available."],
    },
  ]
}

function buildAssetSections(assets: Asset[], findings: RiskFinding[]): PdfSection[] {
  const assetRows = assets.slice().reverse().slice(0, 20)
  const countsByAsset = findings.reduce<Record<string, { high: number; medium: number; low: number }>>((acc, finding) => {
    acc[finding.assetId] ??= { high: 0, medium: 0, low: 0 }
    acc[finding.assetId][finding.riskLevel] += 1
    return acc
  }, {})

  return [
    {
      heading: "Asset Inventory Summary",
      lines: [
        `Tracked assets: ${assets.length}`,
        `Assets currently up: ${activeAssets(assets).length}`,
        `Assets with findings: ${Object.keys(countsByAsset).length}`,
      ],
    },
    {
      heading: "Asset Detail",
      lines: assetRows.length
        ? assetRows.map((asset) => `${asset.hostname} | ${asset.ipAddress} | ${asset.deviceType ?? "unknown"} | ${asset.os ?? "Unknown OS"} | services ${asset.services.length} | findings H:${countsByAsset[asset.id]?.high ?? 0} M:${countsByAsset[asset.id]?.medium ?? 0} L:${countsByAsset[asset.id]?.low ?? 0}`)
        : ["No assets discovered."],
    },
  ]
}

function buildVulnerabilitySections(findings: RiskFinding[]): PdfSection[] {
  const open = openFindings(findings)
  const counts = summarizeCounts(open)
  const top = open.slice(0, 20)

  return [
    {
      heading: "Vulnerability Summary",
      lines: [
        `Open findings: ${open.length}`,
        `High risk findings: ${counts.high}`,
        `Medium risk findings: ${counts.medium}`,
        `Low risk findings: ${counts.low}`,
      ],
    },
    {
      heading: "Open Findings",
      lines: top.length
        ? top.map((finding) => `${finding.riskLevel.toUpperCase()} | ${finding.title} | asset ${finding.assetId} | ${finding.service}/${finding.port} | ${finding.cve ?? "No CVE"} | ${finding.status} | ${finding.recommendation}`)
        : ["No open findings available."],
    },
  ]
}

function buildCsvContent(type: ReportType, scans: ScanResult[], findings: RiskFinding[], assets: Asset[]) {
  const generatedAt = new Date().toISOString()

  if (type === "asset") {
    const rows = [
      toCsvRow(["Report", "Asset Inventory"]),
      toCsvRow(["Generated At", generatedAt]),
      "",
      toCsvRow(["Asset ID", "Hostname", "IP Address", "Device Type", "OS", "Status", "Open Services", "Last Seen"]),
      ...assets.map((asset) =>
        toCsvRow([
          asset.id,
          asset.hostname,
          asset.ipAddress,
          asset.deviceType ?? "unknown",
          asset.os ?? "Unknown",
          asset.status,
          asset.services.map((service) => `${service.port}/${service.protocol} ${service.name}`).join(" | "),
          asset.lastSeenAt,
        ]),
      ),
    ]
    return Buffer.from(rows.join("\n"), "utf8")
  }

  if (type === "scan") {
    const rows = [
      toCsvRow(["Report", "Scan Operations"]),
      toCsvRow(["Generated At", generatedAt]),
      "",
      toCsvRow(["Scan ID", "Agent", "Target", "Scan Type", "Status", "Started At", "Completed At", "Duration (s)", "Total Hosts", "High", "Medium", "Low", "Summary"]),
      ...scans.map((scan) =>
        toCsvRow([
          scan.id,
          scan.agentName,
          scan.target,
          scan.scanType,
          scan.status,
          scan.startedAt,
          scan.completedAt ?? "",
          scan.durationSeconds ?? 0,
          scan.totalHosts,
          scan.vulnerabilities.high,
          scan.vulnerabilities.medium,
          scan.vulnerabilities.low,
          scan.summary,
        ]),
      ),
    ]
    return Buffer.from(rows.join("\n"), "utf8")
  }

  if (type === "vulnerability") {
    const rows = [
      toCsvRow(["Report", "Vulnerability Register"]),
      toCsvRow(["Generated At", generatedAt]),
      "",
      toCsvRow(["Finding ID", "Title", "Risk", "Status", "CVE", "Asset ID", "Service", "Port", "Source", "Recommendation", "Discovered At"]),
      ...findings.map((finding) =>
        toCsvRow([
          finding.id,
          finding.title,
          finding.riskLevel,
          finding.status,
          finding.cve ?? "",
          finding.assetId,
          finding.service,
          finding.port,
          finding.source,
          finding.recommendation,
          finding.discoveredAt,
        ]),
      ),
    ]
    return Buffer.from(rows.join("\n"), "utf8")
  }

  const open = openFindings(findings)
  const counts = summarizeCounts(open)
  const rows = [
    toCsvRow(["Report", "Executive Summary"]),
    toCsvRow(["Generated At", generatedAt]),
    "",
    toCsvRow(["Metric", "Value"]),
    toCsvRow(["Total Scans", scans.length]),
    toCsvRow(["Tracked Assets", assets.length]),
    toCsvRow(["Open Findings", open.length]),
    toCsvRow(["High Risk Findings", counts.high]),
    toCsvRow(["Medium Risk Findings", counts.medium]),
    toCsvRow(["Low Risk Findings", counts.low]),
  ]
  return Buffer.from(rows.join("\n"), "utf8")
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
    return buildCsvContent(type, scans, findings, assets)
  }

  const title = `AetherScan Security Report - ${type.toUpperCase()}`
  const sections =
    type === "scan"
      ? buildScanSections(scans)
      : type === "asset"
        ? buildAssetSections(assets, findings)
        : type === "vulnerability"
          ? buildVulnerabilitySections(findings)
          : buildExecutiveSections(scans, findings, assets)

  return buildPdfDocument(title, [
    {
      heading: "Report Metadata",
      lines: [
        `Generated at: ${new Date().toISOString()}`,
        `Report type: ${type}`,
        `Classification: Internal Security Use`,
      ],
    },
    ...sections,
  ])
}
