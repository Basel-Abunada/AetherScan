import type { Asset, RiskFinding, RiskLevel } from "@/lib/aetherscan/types"
import { makeId, nowIso } from "@/lib/aetherscan/utils"

type FindingTemplate = {
  match: (serviceName: string, port: number, version?: string) => boolean
  title: string
  riskLevel: RiskLevel
  cve?: string
  description: string
  recommendation: string
  source: string
}

const templates: FindingTemplate[] = [
  {
    match: (name, port) => name.includes("telnet") || port === 23,
    title: "Telnet Service Enabled",
    riskLevel: "high",
    description:
      "Telnet exposes credentials and session data in plaintext and should not be used on modern internal networks.",
    recommendation:
      "Disable Telnet and replace it with SSH. Remove the Telnet package or stop the service, then verify port 23 is closed.",
    source: "CISA / CIS",
  },
  {
    match: (name, port) => name.includes("ftp") || port === 21,
    title: "FTP Service Exposed",
    riskLevel: "high",
    description:
      "FTP commonly exposes credentials and files in plaintext and is a common source of weak or anonymous access.",
    recommendation:
      "Disable anonymous FTP, restrict the service, or migrate to SFTP/SSH-based file transfer.",
    source: "CISA / NIST",
  },
  {
    match: (name, port) => name.includes("microsoft-ds") || port === 445,
    title: "SMB Exposure Detected",
    riskLevel: "high",
    cve: "CVE-2017-0144",
    description:
      "SMB services require patching and protocol hardening because legacy SMB configurations are heavily targeted.",
    recommendation:
      "Disable SMBv1, patch the host, restrict SMB exposure, and validate that only required hosts can reach port 445.",
    source: "CISA / Microsoft",
  },
  {
    match: (name, port, version) =>
      name.includes("ssh") || port === 22 ? Boolean(version && /^8\.[0-4]/.test(version)) : false,
    title: "Outdated OpenSSH Version",
    riskLevel: "medium",
    cve: "CVE-2023-38408",
    description:
      "The detected SSH version appears outdated and may miss important security fixes.",
    recommendation:
      "Upgrade OpenSSH to a supported version and re-run the scan to confirm the exposed version changed.",
    source: "NVD / Vendor advisory",
  },
  {
    match: (name, port) => name.includes("http") || port === 80,
    title: "HTTP Service Information Disclosure",
    riskLevel: "medium",
    description:
      "HTTP services often leak version headers or admin panels that increase reconnaissance value for attackers.",
    recommendation:
      "Harden headers, remove default pages, and prefer HTTPS where possible.",
    source: "OWASP / CIS",
  },
  {
    match: (name, port) => name.includes("https") || port === 443,
    title: "Weak TLS Configuration Review Needed",
    riskLevel: "medium",
    description:
      "The HTTPS service should be reviewed for weak protocol or cipher support before production use.",
    recommendation:
      "Allow only TLS 1.2+ and disable deprecated ciphers and protocol versions.",
    source: "NIST / CIS",
  },
  {
    match: (name, port) => name.includes("domain") || port === 53,
    title: "DNS Zone Transfer Review Needed",
    riskLevel: "low",
    description:
      "DNS services can expose internal structure if zone transfers are left open to unauthorized hosts.",
    recommendation:
      "Restrict zone transfers to approved secondary DNS servers only.",
    source: "CIS",
  },
  {
    match: (name, port) => name.includes("snmp") || port === 161,
    title: "Default SNMP Configuration Risk",
    riskLevel: "low",
    description:
      "SNMP services often remain on default community strings, exposing inventory and operational data.",
    recommendation:
      "Use SNMPv3 or rotate community strings to strong non-default values.",
    source: "CISA / CIS",
  },
]

export function buildFindingsForAssets(scanId: string, assets: Asset[]): RiskFinding[] {
  const discoveredAt = nowIso()
  return assets.flatMap((asset) =>
    asset.services.flatMap((service) =>
      templates
        .filter((template) => template.match(service.name.toLowerCase(), service.port, service.version))
        .map((template) => ({
          id: makeId("finding"),
          scanId,
          assetId: asset.id,
          title: template.title,
          cve: template.cve,
          service: service.name,
          port: service.port,
          riskLevel: template.riskLevel,
          description: template.description,
          recommendation: template.recommendation,
          source: template.source,
          status: "open",
          discoveredAt,
        })),
    ),
  )
}

export function summarizeFindings(findings: RiskFinding[]) {
  return findings.reduce(
    (acc, finding) => {
      acc[finding.riskLevel] += 1
      return acc
    },
    { high: 0, medium: 0, low: 0 },
  )
}
