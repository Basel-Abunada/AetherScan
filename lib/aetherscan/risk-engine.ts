import type { Asset, RiskFinding, RiskLevel } from "@/lib/aetherscan/types"
import { makeId, nowIso } from "@/lib/aetherscan/utils"

type FindingTemplate = {
  match: (serviceName: string, port: number, version?: string, product?: string) => boolean
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
    description: "Telnet exposes authentication and session traffic in plaintext and should be considered unsafe on modern networks.",
    recommendation: "Disable Telnet, remove the package if possible, and replace remote administration with SSH using key-based authentication.",
    source: "CISA / CIS",
  },
  {
    match: (name, port) => name.includes("ftp") || port === 21,
    title: "FTP Service Exposed",
    riskLevel: "high",
    description: "FTP commonly exposes credentials and transferred files in plaintext and is frequently left with weak access controls.",
    recommendation: "Disable anonymous FTP, restrict access by firewall, and migrate file transfers to SFTP or SCP.",
    source: "CISA / NIST",
  },
  {
    match: (name, port) => name.includes("tftp") || port === 69,
    title: "TFTP Service Enabled",
    riskLevel: "high",
    description: "TFTP has no native authentication and is commonly abused to read or overwrite sensitive files.",
    recommendation: "Disable TFTP unless strictly required, isolate it on a management network, and restrict access to approved hosts only.",
    source: "CIS / Vendor hardening guides",
  },
  {
    match: (name, port) => name.includes("microsoft-ds") || port === 445,
    title: "SMB Exposure Detected",
    riskLevel: "high",
    cve: "CVE-2017-0144",
    description: "SMB services require patching and protocol hardening because legacy SMB configurations are heavily targeted.",
    recommendation: "Disable SMBv1, apply current Windows patches, restrict SMB to trusted hosts, and verify only required systems can reach port 445.",
    source: "CISA / Microsoft",
  },
  {
    match: (name, port) => name.includes("netbios") || [137, 138, 139].includes(port),
    title: "NetBIOS Exposure Detected",
    riskLevel: "medium",
    description: "NetBIOS services can reveal host naming, shares, and legacy Windows networking information that aids reconnaissance.",
    recommendation: "Disable NetBIOS where not needed, prefer modern name resolution methods, and filter these ports at the network boundary.",
    source: "CIS / Microsoft",
  },
  {
    match: (name, port, version) => (name.includes("ssh") || port === 22) && Boolean(version && /^([1-7]\.|8\.[0-4])/.test(version)),
    title: "Outdated OpenSSH Version",
    riskLevel: "medium",
    cve: "CVE-2023-38408",
    description: "The detected SSH version appears outdated and may be missing recent security fixes and hardening improvements.",
    recommendation: "Upgrade OpenSSH to a supported release, disable password authentication where possible, and re-run the scan to confirm the service version changed.",
    source: "NVD / Vendor advisory",
  },
  {
    match: (name, port) => name.includes("http") || port === 80,
    title: "HTTP Service Information Disclosure",
    riskLevel: "medium",
    description: "Unencrypted HTTP often exposes headers, default content, and admin interfaces that increase reconnaissance value for attackers.",
    recommendation: "Redirect users to HTTPS, remove default pages, harden response headers, and restrict management interfaces.",
    source: "OWASP / CIS",
  },
  {
    match: (name, port) => name.includes("https") || port === 443,
    title: "TLS Configuration Review Needed",
    riskLevel: "medium",
    description: "The HTTPS service should be reviewed for deprecated protocols, weak ciphers, and certificate hygiene issues.",
    recommendation: "Allow only TLS 1.2 or newer, disable deprecated ciphers, and validate certificate trust, expiry, and hostnames.",
    source: "NIST / CIS",
  },
  {
    match: (name, port) => name.includes("smtp") || [25, 465, 587].includes(port),
    title: "SMTP Service Exposure",
    riskLevel: "medium",
    description: "Exposed SMTP services may be abused for relay testing, banner enumeration, or user discovery if not hardened.",
    recommendation: "Confirm open relay is disabled, require authentication where appropriate, and restrict SMTP management to approved hosts.",
    source: "CIS / Vendor mail security guidance",
  },
  {
    match: (name, port) => name.includes("imap") || [143, 993].includes(port),
    title: "IMAP Service Review Needed",
    riskLevel: "low",
    description: "IMAP services may expose mailbox access over insecure or weakly configured channels if not reviewed.",
    recommendation: "Enforce TLS, disable legacy authentication methods, and confirm only intended users can reach the service.",
    source: "NIST / Email hardening guidance",
  },
  {
    match: (name, port) => name.includes("pop3") || [110, 995].includes(port),
    title: "POP3 Service Review Needed",
    riskLevel: "low",
    description: "POP3 is a legacy email protocol and may expose credentials or metadata if deployed insecurely.",
    recommendation: "Disable POP3 if unnecessary, require encryption, and migrate users to more secure mail access options where possible.",
    source: "Email security best practices",
  },
  {
    match: (name, port) => name.includes("domain") || port === 53,
    title: "DNS Zone Transfer Review Needed",
    riskLevel: "low",
    description: "DNS servers can expose internal host naming and topology if zone transfers remain open to unauthorized systems.",
    recommendation: "Restrict zone transfers to approved secondary DNS servers only and audit public recursion settings.",
    source: "CIS",
  },
  {
    match: (name, port) => name.includes("snmp") || port === 161,
    title: "SNMP Configuration Risk",
    riskLevel: "low",
    description: "SNMP services often remain on default community strings, exposing inventory and operational data.",
    recommendation: "Use SNMPv3 where possible, rotate community strings, and limit management access to trusted hosts only.",
    source: "CISA / CIS",
  },
  {
    match: (name, port) => name.includes("rdp") || port === 3389,
    title: "Remote Desktop Exposure",
    riskLevel: "high",
    description: "Remote Desktop services are heavily targeted and can expose systems to brute-force and credential reuse attacks.",
    recommendation: "Restrict RDP by VPN or jump host, enforce MFA and Network Level Authentication, and limit access with firewall rules.",
    source: "CISA / Microsoft",
  },
  {
    match: (name, port) => name.includes("vnc") || [5900, 5901, 5902].includes(port),
    title: "VNC Service Exposed",
    riskLevel: "high",
    description: "VNC frequently lacks strong transport security and is risky when reachable without segmentation or tunneling.",
    recommendation: "Disable direct VNC exposure, tunnel it through VPN or SSH, and require strong unique credentials.",
    source: "CIS / Vendor guidance",
  },
  {
    match: (name, port) => name.includes("mysql") || port === 3306,
    title: "MySQL Service Exposed",
    riskLevel: "medium",
    description: "Direct database exposure increases the risk of brute-force, misconfiguration, and data leakage.",
    recommendation: "Restrict database access to application servers only, disable remote root access, and enforce strong authentication.",
    source: "MySQL hardening guidance",
  },
  {
    match: (name, port) => name.includes("postgres") || port === 5432,
    title: "PostgreSQL Service Exposed",
    riskLevel: "medium",
    description: "Open PostgreSQL services can reveal database versioning and invite password attacks if exposed beyond trusted systems.",
    recommendation: "Bind PostgreSQL to trusted interfaces only, enforce strong credentials, and restrict access with host-based rules.",
    source: "PostgreSQL documentation / CIS",
  },
  {
    match: (name, port) => name.includes("mongodb") || port === 27017,
    title: "MongoDB Service Exposed",
    riskLevel: "high",
    description: "Exposed MongoDB services have historically been abused when authentication or network controls were weak.",
    recommendation: "Enable authentication, restrict network access to application hosts, and place MongoDB behind private subnets or VPN-only access.",
    source: "MongoDB Security Checklist",
  },
  {
    match: (name, port) => name.includes("redis") || port === 6379,
    title: "Redis Service Exposed",
    riskLevel: "high",
    description: "Redis is not intended for direct internet or broad network exposure and can be abused when left unauthenticated.",
    recommendation: "Bind Redis to localhost or trusted networks, enable authentication where appropriate, and block untrusted access at the firewall.",
    source: "Redis Security Guidance",
  },
  {
    match: (name, port) => name.includes("memcached") || port === 11211,
    title: "Memcached Service Exposed",
    riskLevel: "high",
    description: "Memcached exposure can leak cached data and has been abused in amplification attacks.",
    recommendation: "Disable public exposure, bind to internal interfaces only, and restrict access with host firewall rules.",
    source: "CISA / Vendor guidance",
  },
  {
    match: (name, port) => name.includes("ldap") || [389, 636].includes(port),
    title: "Directory Service Exposure",
    riskLevel: "medium",
    description: "LDAP exposure can reveal directory metadata, authentication endpoints, and internal naming information.",
    recommendation: "Restrict LDAP to trusted clients, require LDAPS or StartTLS, and limit anonymous binds.",
    source: "CIS / Directory service hardening",
  },
  {
    match: (name, port) => name.includes("kerberos") || [88, 464].includes(port),
    title: "Kerberos Service Exposure",
    riskLevel: "medium",
    description: "Kerberos infrastructure is sensitive and should remain segmented to reduce attack surface against core identity services.",
    recommendation: "Limit Kerberos access to domain-joined systems and monitor authentication failures for brute-force patterns.",
    source: "Microsoft / AD hardening guidance",
  },
  {
    match: (name, port) => name.includes("rpc") || port === 111,
    title: "RPC Service Exposed",
    riskLevel: "medium",
    description: "RPC services can reveal additional service mappings and increase the attack surface for lateral movement.",
    recommendation: "Disable unused RPC services and restrict exposure through host firewalls and segmentation.",
    source: "CIS Benchmarks",
  },
  {
    match: (name, port) => name.includes("nfs") || port === 2049,
    title: "NFS Service Exposed",
    riskLevel: "medium",
    description: "NFS shares can expose sensitive file systems when export permissions are broad or unmanaged.",
    recommendation: "Restrict exports to approved clients, enforce least privilege, and review share permissions regularly.",
    source: "CIS / Linux hardening guidance",
  },
  {
    match: (name, port) => name.includes("docker") || port === 2375,
    title: "Docker API Exposed Without TLS",
    riskLevel: "high",
    description: "The Docker remote API on port 2375 is highly sensitive and can allow container or host compromise when exposed.",
    recommendation: "Disable unauthenticated Docker TCP access, require TLS on remote APIs, and bind the daemon to local sockets where possible.",
    source: "Docker Security Documentation",
  },
  {
    match: (name, port) => name.includes("kubernetes") || [6443, 10250].includes(port),
    title: "Kubernetes Management Interface Exposed",
    riskLevel: "high",
    description: "Kubernetes API and kubelet interfaces are sensitive management surfaces that should not be broadly exposed.",
    recommendation: "Restrict management interfaces to cluster administrators, require strong authentication, and audit RBAC and network policies.",
    source: "Kubernetes Security Best Practices",
  },
  {
    match: (name, port) => name.includes("sip") || [5060, 5061].includes(port),
    title: "VoIP Signaling Exposure",
    riskLevel: "low",
    description: "SIP services can leak PBX metadata and may be abused for toll fraud or user enumeration if weakly configured.",
    recommendation: "Restrict SIP to authorized peers, enable TLS/SRTP where supported, and monitor registration anomalies.",
    source: "VoIP hardening guidance",
  },
  {
    match: (name, port, _version, product) => name.includes("apache") || product?.toLowerCase().includes("apache") || port === 8080,
    title: "Web Server Review Needed",
    riskLevel: "low",
    description: "Detected web server software should be reviewed for default content, admin endpoints, and outdated modules.",
    recommendation: "Remove unused modules, hide version banners, patch the server regularly, and review exposed virtual hosts and admin paths.",
    source: "OWASP / CIS",
  },
]

export function buildFindingsForAssets(scanId: string, assets: Asset[]): RiskFinding[] {
  const discoveredAt = nowIso()
  return assets.flatMap((asset) =>
    asset.services.flatMap((service) =>
      templates
        .filter((template) => template.match(service.name.toLowerCase(), service.port, service.version, service.product?.toLowerCase()))
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
