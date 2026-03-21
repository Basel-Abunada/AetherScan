import type { Asset, NmapScriptResult, RiskFinding, RiskLevel } from "@/lib/aetherscan/types"
import { makeId, nowIso } from "@/lib/aetherscan/utils"

type ServiceContext = {
  name: string
  product: string
  version: string
  fingerprint: string
  port: number
}

type FindingTemplate = {
  title: string
  riskLevel: RiskLevel
  cve?: string
  cwe?: string
  source: string
  referenceUrl?: string
  description: (context: ServiceContext) => string
  recommendation: (context: ServiceContext) => string
  match: (context: ServiceContext) => boolean
}

type ScriptFindingTemplate = {
  scriptId: string
  title: string
  riskLevel: RiskLevel
  cve?: string
  cwe?: string
  source: string
  referenceUrl?: string
  description: (output: string, serviceLabel: string) => string
  recommendation: (output: string) => string
}

function nvdUrl(cve: string) {
  return `https://nvd.nist.gov/vuln/detail/${cve}`
}

function cweUrl(cwe: string) {
  return `https://cwe.mitre.org/data/definitions/${cwe.replace(/^CWE-/, "")}.html`
}

function normalize(value?: string | number | boolean | null) {
  return String(value ?? "").toLowerCase()
}

function parseVersion(value?: string) {
  const match = (value ?? "").match(/\d+(?:\.\d+){0,3}/)
  if (!match) return []
  return match[0].split(".").map((segment) => Number(segment))
}

function compareVersions(left: number[], right: number[]) {
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index] ?? 0
    const rightPart = right[index] ?? 0
    if (leftPart > rightPart) return 1
    if (leftPart < rightPart) return -1
  }
  return 0
}

function versionAtMost(value: string, maxVersion: string) {
  const parsed = parseVersion(value)
  if (!parsed.length) return false
  return compareVersions(parsed, parseVersion(maxVersion)) <= 0
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle))
}

function formatService(context: ServiceContext) {
  const productVersion = [context.product, context.version].filter(Boolean).join(" ").trim()
  return productVersion || context.name || `port ${context.port}`
}

function truncate(value: string, maxLength = 280) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`
}

function deriveGenericRisk(output: string): RiskLevel {
  const lower = output.toLowerCase()
  if (includesAny(lower, ["critical", "remote code execution", "wormable", "cvss: 9", "cvss:9", "high"])) return "high"
  if (includesAny(lower, ["medium", "moderate", "authentication bypass", "information disclosure"])) return "medium"
  return "low"
}

function extractCve(output: string) {
  return output.match(/CVE-\d{4}-\d{4,7}/i)?.[0]?.toUpperCase()
}

function hasPositiveVulnerabilitySignal(output: string) {
  const lower = output.toLowerCase()
  return includesAny(lower, [
    "state: vulnerable",
    "vulnerable",
    "vulns",
    "confirmed",
    "exploitable",
    "remote code execution",
    "authentication bypass",
    "arbitrary file read",
    "arbitrary file upload",
    "sql injection",
    "command execution",
    "directory traversal",
    "information disclosure",
    "denial of service",
    "heartbleed",
    "shellshock",
    "ms08-067",
    "ms12-020",
    "ms17-010",
    "cve-",
  ])
}

function hasNegativeVulnerabilitySignal(output: string) {
  const lower = output.toLowerCase()
  return includesAny(lower, [
    "state: not vulnerable",
    "not tested",
    "no vulnerabilities found",
    "could not",
    "failed",
    "error",
    "timed out",
    "timeout",
    "connection refused",
    "connection reset",
    "access denied",
    "login failed",
    "unable to negotiate",
    "failed to receive bytes",
    "no reply",
  ])
}

const templates: FindingTemplate[] = [
  {
    title: "Telnet Service Enabled",
    riskLevel: "high",
    cve: "CVE-2020-10188",
    source: "NVD / CISA",
    referenceUrl: nvdUrl("CVE-2020-10188"),
    match: (context) => context.port === 23 || includesAny(context.fingerprint, ["telnet"]),
    description: (context) => `${formatService(context)} is reachable over Telnet, which exposes credentials and administrative sessions in plaintext and is frequently abused for lateral movement.`,
    recommendation: () => "Disable Telnet, remove the service if possible, and replace remote administration with SSH using key-based authentication and network segmentation.",
  },
  {
    title: "FTP Service Exposed",
    riskLevel: "high",
    cve: "CVE-2015-3306",
    source: "NVD / ProFTPD Advisory",
    referenceUrl: nvdUrl("CVE-2015-3306"),
    match: (context) => context.port === 21 || includesAny(context.fingerprint, ["ftp", "vsftpd", "proftpd", "pure-ftpd"]),
    description: (context) => `${formatService(context)} is exposed over FTP. Plaintext authentication and legacy server flaws make this service a common entry point for credential theft and unauthorized file access.`,
    recommendation: () => "Disable anonymous FTP, restrict access by firewall, and migrate file transfers to SFTP or SCP. Patch the FTP daemon if the service must remain enabled.",
  },
  {
    title: "TFTP Service Enabled",
    riskLevel: "high",
    cwe: "CWE-306",
    source: "CIS / Vendor Hardening Guides",
    referenceUrl: cweUrl("CWE-306"),
    match: (context) => context.port === 69 || includesAny(context.fingerprint, ["tftp"]),
    description: (context) => `${formatService(context)} is available over TFTP, which provides no native authentication and is often abused to retrieve or overwrite sensitive configuration files.`,
    recommendation: () => "Disable TFTP unless it is operationally required, isolate it on a management network, and strictly limit access to approved hosts only.",
  },
  {
    title: "SMB Exposure Detected",
    riskLevel: "high",
    cve: "CVE-2017-0144",
    source: "NVD / Microsoft / CISA",
    referenceUrl: nvdUrl("CVE-2017-0144"),
    match: (context) => context.port === 445 || includesAny(context.fingerprint, ["smb", "microsoft-ds"]),
    description: (context) => `${formatService(context)} is reachable over SMB. Legacy SMB configurations and unpatched Windows hosts are commonly associated with wormable exploitation paths such as EternalBlue.`,
    recommendation: () => "Disable SMBv1, apply current Windows security updates, restrict SMB to trusted hosts, and verify only required systems can reach port 445.",
  },
  {
    title: "NetBIOS Exposure Detected",
    riskLevel: "medium",
    cwe: "CWE-200",
    source: "CIS / Microsoft Hardening Guidance",
    referenceUrl: cweUrl("CWE-200"),
    match: (context) => [137, 138, 139].includes(context.port) || includesAny(context.fingerprint, ["netbios"]),
    description: (context) => `${formatService(context)} exposes NetBIOS services that can leak hostnames, shares, and legacy Windows networking information useful for reconnaissance.`,
    recommendation: () => "Disable NetBIOS where it is not needed, prefer modern name resolution methods, and filter these ports at the network boundary.",
  },
  {
    title: "Outdated OpenSSH Version",
    riskLevel: "medium",
    cve: "CVE-2023-38408",
    source: "NVD / OpenSSH Advisory",
    referenceUrl: nvdUrl("CVE-2023-38408"),
    match: (context) => (context.port === 22 || includesAny(context.fingerprint, ["ssh", "openssh"])) && versionAtMost(context.version, "8.4"),
    description: (context) => `${formatService(context)} appears to be running an older OpenSSH release that may miss recent security fixes and hardening improvements.`,
    recommendation: () => "Upgrade OpenSSH to a supported release, disable password authentication where possible, and enforce key-based access with allow-listed administrative sources.",
  },
  {
    title: "Remote Desktop Exposure",
    riskLevel: "high",
    cve: "CVE-2019-0708",
    source: "NVD / Microsoft / CISA",
    referenceUrl: nvdUrl("CVE-2019-0708"),
    match: (context) => context.port === 3389 || includesAny(context.fingerprint, ["rdp", "ms-wbt-server", "remote desktop"]),
    description: (context) => `${formatService(context)} is exposed over RDP. Internet- or network-reachable RDP is heavily targeted for brute-force, credential stuffing, and pre-authentication exploitation.`,
    recommendation: () => "Restrict RDP behind VPN or a jump host, enforce MFA and Network Level Authentication, and limit exposure using host and network firewalls.",
  },
  {
    title: "VNC Service Exposed",
    riskLevel: "high",
    cwe: "CWE-306",
    source: "CIS / Vendor Guidance",
    referenceUrl: cweUrl("CWE-306"),
    match: (context) => [5900, 5901, 5902].includes(context.port) || includesAny(context.fingerprint, ["vnc", "rfb"]),
    description: (context) => `${formatService(context)} is reachable over VNC. VNC frequently lacks strong transport security and should not be exposed without segmentation or tunneling.`,
    recommendation: () => "Disable direct VNC exposure, tunnel access through VPN or SSH, and require strong unique credentials with access control lists.",
  },
  {
    title: "Unencrypted HTTP Service",
    riskLevel: "medium",
    cwe: "CWE-319",
    source: "OWASP / CIS",
    referenceUrl: cweUrl("CWE-319"),
    match: (context) => context.port === 80 || context.name === "http",
    description: (context) => `${formatService(context)} is available over HTTP without transport encryption, increasing the risk of credential interception, session hijacking, and header-based information leakage.`,
    recommendation: () => "Redirect users to HTTPS, remove default content, harden response headers, and ensure sensitive interfaces are not exposed over plaintext HTTP.",
  },
  {
    title: "TLS Configuration Review Needed",
    riskLevel: "medium",
    cwe: "CWE-326",
    source: "NIST / CIS",
    referenceUrl: cweUrl("CWE-326"),
    match: (context) => context.port === 443 || includesAny(context.fingerprint, ["https", "ssl/http", "tls"]),
    description: (context) => `${formatService(context)} uses TLS and should be reviewed for deprecated protocol support, weak ciphers, and certificate hygiene issues.`,
    recommendation: () => "Allow only TLS 1.2 or newer, disable deprecated ciphers, and validate certificate trust, expiry, and hostname coverage.",
  },
  {
    title: "Apache HTTP Server Path Traversal Risk",
    riskLevel: "high",
    cve: "CVE-2021-41773",
    source: "NVD / Apache Advisory",
    referenceUrl: nvdUrl("CVE-2021-41773"),
    match: (context) => includesAny(context.product, ["apache httpd"]) && ["2.4.49", "2.4.50"].some((version) => context.version.includes(version)),
    description: (context) => `${formatService(context)} matches Apache HTTP Server versions associated with path traversal and potential remote code execution if vulnerable modules are enabled.`,
    recommendation: () => "Upgrade Apache HTTP Server immediately, review enabled modules and aliases, and confirm traversal protections after patching.",
  },
  {
    title: "Nginx Resolver Vulnerability Review",
    riskLevel: "medium",
    cve: "CVE-2021-23017",
    source: "NVD / Nginx Advisory",
    referenceUrl: nvdUrl("CVE-2021-23017"),
    match: (context) => includesAny(context.product, ["nginx"]) && versionAtMost(context.version, "1.20.0"),
    description: (context) => `${formatService(context)} appears to be an older Nginx build that should be reviewed for known resolver handling vulnerabilities and security fixes.`,
    recommendation: () => "Upgrade Nginx to a current supported release, review resolver configuration, and re-scan the host to confirm the version change.",
  },
  {
    title: "Exim Mail Server Review Needed",
    riskLevel: "high",
    cve: "CVE-2019-15846",
    source: "NVD / Exim Advisory",
    referenceUrl: nvdUrl("CVE-2019-15846"),
    match: (context) => includesAny(context.product, ["exim"]) && versionAtMost(context.version, "4.92.2"),
    description: (context) => `${formatService(context)} appears to be an older Exim release associated with remote command execution risk in exposed mail infrastructure.`,
    recommendation: () => "Patch Exim to a fixed version, restrict SMTP exposure to approved mail relays, and review relay/authentication policy.",
  },
  {
    title: "SMTP Service Exposure",
    riskLevel: "medium",
    cwe: "CWE-284",
    source: "CIS / Vendor Mail Security Guidance",
    referenceUrl: cweUrl("CWE-284"),
    match: (context) => [25, 465, 587].includes(context.port) || includesAny(context.fingerprint, ["smtp", "submission"]),
    description: (context) => `${formatService(context)} exposes SMTP services that may be abused for relay testing, banner enumeration, or user discovery if not hardened.`,
    recommendation: () => "Confirm open relay is disabled, require authentication where appropriate, and restrict SMTP management to approved hosts.",
  },
  {
    title: "Legacy Mail Access Service Review",
    riskLevel: "low",
    cwe: "CWE-522",
    source: "Email Security Best Practices",
    referenceUrl: cweUrl("CWE-522"),
    match: (context) => [110, 143, 993, 995].includes(context.port) || includesAny(context.fingerprint, ["imap", "pop3"]),
    description: (context) => `${formatService(context)} provides mailbox access and should be reviewed to ensure legacy protocols and weak authentication methods are not still enabled.`,
    recommendation: () => "Require TLS, disable legacy authentication methods, and migrate users away from unnecessary POP3/legacy mail access services.",
  },
  {
    title: "DNS Service Zone Transfer Review",
    riskLevel: "low",
    cwe: "CWE-200",
    source: "CIS Benchmarks",
    referenceUrl: cweUrl("CWE-200"),
    match: (context) => context.port === 53 || includesAny(context.fingerprint, ["domain", "dns", "bind"]),
    description: (context) => `${formatService(context)} is providing DNS services and may expose internal host naming and topology if zone transfers or recursion are loosely configured.`,
    recommendation: () => "Restrict zone transfers to approved secondary DNS servers only and audit recursion, split-horizon, and external exposure settings.",
  },
  {
    title: "BIND DNS Version Review Needed",
    riskLevel: "medium",
    cve: "CVE-2020-8616",
    source: "NVD / ISC Advisory",
    referenceUrl: nvdUrl("CVE-2020-8616"),
    match: (context) => includesAny(context.product, ["bind"]) && versionAtMost(context.version, "9.16.5"),
    description: (context) => `${formatService(context)} appears to be an older BIND release that should be reviewed for known denial-of-service and parser vulnerabilities.`,
    recommendation: () => "Update BIND to a current supported version and confirm authoritative and recursive roles are segmented appropriately.",
  },
  {
    title: "SNMP Configuration Risk",
    riskLevel: "low",
    cwe: "CWE-798",
    source: "CISA / CIS",
    referenceUrl: cweUrl("CWE-798"),
    match: (context) => context.port === 161 || includesAny(context.fingerprint, ["snmp"]),
    description: (context) => `${formatService(context)} exposes SNMP, a protocol frequently left with default community strings or broad management access.`,
    recommendation: () => "Use SNMPv3 where possible, rotate community strings, and limit access to trusted management stations only.",
  },
  {
    title: "LDAP Directory Exposure",
    riskLevel: "medium",
    cwe: "CWE-200",
    source: "CIS / Directory Service Hardening",
    referenceUrl: cweUrl("CWE-200"),
    match: (context) => [389, 636].includes(context.port) || includesAny(context.fingerprint, ["ldap"]),
    description: (context) => `${formatService(context)} exposes directory services that can reveal authentication endpoints and internal naming metadata when broadly reachable.`,
    recommendation: () => "Restrict LDAP to trusted clients, require LDAPS or StartTLS, and disable anonymous binds unless there is a documented business need.",
  },
  {
    title: "Kerberos Service Exposure",
    riskLevel: "medium",
    cwe: "CWE-284",
    source: "Microsoft / Active Directory Hardening Guidance",
    referenceUrl: cweUrl("CWE-284"),
    match: (context) => [88, 464].includes(context.port) || includesAny(context.fingerprint, ["kerberos"]),
    description: (context) => `${formatService(context)} is part of identity infrastructure and should remain segmented to reduce the attack surface against central authentication services.`,
    recommendation: () => "Limit Kerberos access to domain-joined systems, monitor failures for brute-force patterns, and segment identity services from general user networks.",
  },
  {
    title: "NFS Service Exposed",
    riskLevel: "medium",
    cwe: "CWE-284",
    source: "CIS / Linux Hardening Guidance",
    referenceUrl: cweUrl("CWE-284"),
    match: (context) => context.port === 2049 || includesAny(context.fingerprint, ["nfs"]),
    description: (context) => `${formatService(context)} provides NFS access and can expose sensitive file systems when export permissions are broad or unmanaged.`,
    recommendation: () => "Restrict exports to approved clients, enforce least privilege, and review share permissions and root squashing regularly.",
  },
  {
    title: "RPC Service Exposed",
    riskLevel: "medium",
    cwe: "CWE-668",
    source: "CIS Benchmarks",
    referenceUrl: cweUrl("CWE-668"),
    match: (context) => context.port === 111 || includesAny(context.fingerprint, ["rpc", "portmapper"]),
    description: (context) => `${formatService(context)} exposes RPC services that can reveal additional service mappings and increase the attack surface for lateral movement.`,
    recommendation: () => "Disable unused RPC services and limit exposure using host firewalls and network segmentation.",
  },
  {
    title: "MySQL Service Exposed",
    riskLevel: "medium",
    cve: "CVE-2012-2122",
    source: "NVD / Oracle Advisory",
    referenceUrl: nvdUrl("CVE-2012-2122"),
    match: (context) => context.port === 3306 || includesAny(context.fingerprint, ["mysql", "mariadb"]),
    description: (context) => `${formatService(context)} is directly reachable and increases the risk of brute-force, misconfiguration, and database metadata disclosure.`,
    recommendation: () => "Restrict database access to application servers only, disable remote administrative access, and enforce strong authentication with network allow lists.",
  },
  {
    title: "PostgreSQL Service Exposed",
    riskLevel: "medium",
    cve: "CVE-2018-1058",
    source: "NVD / PostgreSQL Advisory",
    referenceUrl: nvdUrl("CVE-2018-1058"),
    match: (context) => context.port === 5432 || includesAny(context.fingerprint, ["postgres", "postgresql"]),
    description: (context) => `${formatService(context)} is reachable over PostgreSQL and may reveal versioning details or permit password attacks if exposed beyond trusted systems.`,
    recommendation: () => "Bind PostgreSQL to trusted interfaces only, restrict access with host-based rules, and rotate privileged credentials.",
  },
  {
    title: "MongoDB Service Exposed",
    riskLevel: "high",
    cve: "CVE-2019-10758",
    source: "NVD / MongoDB Security Checklist",
    referenceUrl: nvdUrl("CVE-2019-10758"),
    match: (context) => context.port === 27017 || includesAny(context.fingerprint, ["mongodb"]),
    description: (context) => `${formatService(context)} is exposed and has historically been abused when authentication, authorization, or network controls were weak.`,
    recommendation: () => "Enable authentication, restrict network access to application hosts, and place MongoDB behind private subnets or VPN-only access.",
  },
  {
    title: "Redis Service Exposed",
    riskLevel: "high",
    cve: "CVE-2022-0543",
    source: "NVD / Redis Security Guidance",
    referenceUrl: nvdUrl("CVE-2022-0543"),
    match: (context) => context.port === 6379 || includesAny(context.fingerprint, ["redis"]),
    description: (context) => `${formatService(context)} is directly reachable. Redis is not designed for broad exposure and can be abused when left unauthenticated or weakly isolated.`,
    recommendation: () => "Bind Redis to localhost or trusted networks, enable authentication where appropriate, and block untrusted access at the firewall.",
  },
  {
    title: "Memcached Service Exposed",
    riskLevel: "high",
    cwe: "CWE-284",
    source: "CISA / Vendor Guidance",
    referenceUrl: cweUrl("CWE-284"),
    match: (context) => context.port === 11211 || includesAny(context.fingerprint, ["memcached"]),
    description: (context) => `${formatService(context)} exposes Memcached, which can leak cached data and has been abused in amplification attacks.`,
    recommendation: () => "Disable public exposure, bind to internal interfaces only, and restrict access using host firewall rules.",
  },
  {
    title: "Docker API Exposed Without TLS",
    riskLevel: "high",
    cve: "CVE-2019-5736",
    source: "NVD / Docker Security Documentation",
    referenceUrl: nvdUrl("CVE-2019-5736"),
    match: (context) => context.port === 2375 || includesAny(context.fingerprint, ["docker"]),
    description: (context) => `${formatService(context)} exposes the Docker remote API, a highly sensitive management surface that can lead to container or host compromise.`,
    recommendation: () => "Disable unauthenticated Docker TCP access, require TLS on remote APIs, and bind the daemon to local sockets wherever possible.",
  },
  {
    title: "Kubernetes Management Interface Exposed",
    riskLevel: "high",
    cve: "CVE-2018-1002105",
    source: "NVD / Kubernetes Security Best Practices",
    referenceUrl: nvdUrl("CVE-2018-1002105"),
    match: (context) => [6443, 10250].includes(context.port) || includesAny(context.fingerprint, ["kubernetes", "kubelet"]),
    description: (context) => `${formatService(context)} exposes a Kubernetes management surface that should never be broadly reachable from user or untrusted networks.`,
    recommendation: () => "Restrict cluster management interfaces to administrators, require strong authentication, and audit RBAC plus network policy boundaries.",
  },
  {
    title: "Tomcat AJP Exposure",
    riskLevel: "high",
    cve: "CVE-2020-1938",
    source: "NVD / Apache Tomcat Advisory",
    referenceUrl: nvdUrl("CVE-2020-1938"),
    match: (context) => context.port === 8009 || includesAny(context.fingerprint, ["ajp13", "tomcat"]),
    description: (context) => `${formatService(context)} exposes an Apache Tomcat AJP endpoint associated with Ghostcat-style file inclusion and information disclosure risks when weakly segmented.`,
    recommendation: () => "Disable AJP if unnecessary, bind it to localhost or trusted application tiers only, and upgrade Tomcat to a patched release.",
  },
  {
    title: "Jenkins Management Interface Exposed",
    riskLevel: "high",
    cve: "CVE-2024-23897",
    source: "NVD / Jenkins Advisory",
    referenceUrl: nvdUrl("CVE-2024-23897"),
    match: (context) => includesAny(context.fingerprint, ["jenkins"]) || (context.port === 8080 && includesAny(context.product, ["jenkins"])),
    description: (context) => `${formatService(context)} appears to expose a Jenkins management interface, which is highly sensitive and should not be broadly accessible.`,
    recommendation: () => "Restrict Jenkins behind SSO or VPN, patch to a supported release, and remove anonymous or weakly authenticated access paths.",
  },
  {
    title: "Elasticsearch Service Exposed",
    riskLevel: "high",
    cve: "CVE-2015-1427",
    source: "NVD / Elastic Advisory",
    referenceUrl: nvdUrl("CVE-2015-1427"),
    match: (context) => [9200, 9300].includes(context.port) || includesAny(context.fingerprint, ["elasticsearch"]),
    description: (context) => `${formatService(context)} exposes Elasticsearch services that can leak indexed data and administrative surfaces when not tightly restricted.`,
    recommendation: () => "Restrict Elasticsearch to private application networks, require authentication, and ensure scripting and management features are patched and reviewed.",
  },
  {
    title: "VoIP Signaling Exposure",
    riskLevel: "low",
    cwe: "CWE-200",
    source: "VoIP Hardening Guidance",
    referenceUrl: cweUrl("CWE-200"),
    match: (context) => [5060, 5061].includes(context.port) || includesAny(context.fingerprint, ["sip"]),
    description: (context) => `${formatService(context)} exposes SIP signaling that can leak PBX metadata and enable toll fraud or user enumeration when weakly configured.`,
    recommendation: () => "Restrict SIP to authorized peers, enable TLS or SRTP where supported, and monitor registration anomalies and abuse patterns.",
  },
]

const scriptTemplates: ScriptFindingTemplate[] = [
  {
    scriptId: "smb-vuln-ms17-010",
    title: "SMB Remote Code Execution Vulnerability Detected",
    riskLevel: "high",
    cve: "CVE-2017-0144",
    source: "NVD / Microsoft / NSE smb-vuln-ms17-010",
    referenceUrl: nvdUrl("CVE-2017-0144"),
    description: (output, serviceLabel) => `${serviceLabel} was flagged by the NSE script smb-vuln-ms17-010. ${truncate(output)}`,
    recommendation: () => "Patch the target with the relevant Microsoft security update, disable SMBv1, and restrict SMB exposure to trusted hosts only.",
  },
  {
    scriptId: "smb-vuln-ms08-067",
    title: "SMB MS08-067 Vulnerability Detected",
    riskLevel: "high",
    cve: "CVE-2008-4250",
    source: "NVD / Microsoft / NSE smb-vuln-ms08-067",
    referenceUrl: nvdUrl("CVE-2008-4250"),
    description: (output, serviceLabel) => `${serviceLabel} was flagged by the NSE script smb-vuln-ms08-067. ${truncate(output)}`,
    recommendation: () => "Apply the Microsoft patch for MS08-067 immediately and remove exposure of the vulnerable SMB service from untrusted networks.",
  },
  {
    scriptId: "ssl-heartbleed",
    title: "OpenSSL Heartbleed Vulnerability Detected",
    riskLevel: "high",
    cve: "CVE-2014-0160",
    source: "NVD / OpenSSL / NSE ssl-heartbleed",
    referenceUrl: nvdUrl("CVE-2014-0160"),
    description: (output, serviceLabel) => `${serviceLabel} appears vulnerable to Heartbleed based on NSE output. ${truncate(output)}`,
    recommendation: () => "Upgrade OpenSSL to a fixed release, replace affected private keys and certificates, and verify TLS endpoints after remediation.",
  },
  {
    scriptId: "ssl-poodle",
    title: "SSL POODLE Vulnerability Detected",
    riskLevel: "medium",
    cve: "CVE-2014-3566",
    source: "NVD / NSE ssl-poodle",
    referenceUrl: nvdUrl("CVE-2014-3566"),
    description: (output, serviceLabel) => `${serviceLabel} appears to support SSLv3 or weak downgrade behavior associated with POODLE. ${truncate(output)}`,
    recommendation: () => "Disable SSLv3 and legacy downgrade paths, prefer TLS 1.2 or newer, and retest the endpoint after configuration changes.",
  },
  {
    scriptId: "http-shellshock",
    title: "Shellshock Exposure Detected",
    riskLevel: "high",
    cve: "CVE-2014-6271",
    source: "NVD / NSE http-shellshock",
    referenceUrl: nvdUrl("CVE-2014-6271"),
    description: (output, serviceLabel) => `${serviceLabel} appears vulnerable to Shellshock-style command execution based on NSE testing. ${truncate(output)}`,
    recommendation: () => "Patch Bash and CGI handlers immediately, disable unnecessary CGI scripts, and restrict web administrative endpoints.",
  },
  {
    scriptId: "ftp-vsftpd-backdoor",
    title: "VSFTPD Backdoor Exposure Detected",
    riskLevel: "high",
    cve: "CVE-2011-2523",
    source: "NVD / NSE ftp-vsftpd-backdoor",
    referenceUrl: nvdUrl("CVE-2011-2523"),
    description: (output, serviceLabel) => `${serviceLabel} was flagged by NSE as a VSFTPD backdoor candidate. ${truncate(output)}`,
    recommendation: () => "Remove the compromised VSFTPD version, install a trusted patched release, and rotate any potentially exposed credentials.",
  },
  {
    scriptId: "http-vuln-cve2017-5638",
    title: "Apache Struts Remote Code Execution Detected",
    riskLevel: "high",
    cve: "CVE-2017-5638",
    source: "NVD / NSE http-vuln-cve2017-5638",
    referenceUrl: nvdUrl("CVE-2017-5638"),
    description: (output, serviceLabel) => `${serviceLabel} may be vulnerable to Apache Struts command execution according to NSE output. ${truncate(output)}`,
    recommendation: () => "Patch Apache Struts immediately, remove vulnerable plugins, and review application logs for exploitation attempts.",
  },
  {
    scriptId: "http-vuln-cve2014-3704",
    title: "Drupal SQL Injection Vulnerability Detected",
    riskLevel: "high",
    cve: "CVE-2014-3704",
    source: "NVD / NSE http-vuln-cve2014-3704",
    referenceUrl: nvdUrl("CVE-2014-3704"),
    description: (output, serviceLabel) => `${serviceLabel} was flagged for Drupal SQL injection exposure. ${truncate(output)}`,
    recommendation: () => "Patch Drupal to a fixed version, rotate privileged credentials, and review the site for compromise indicators.",
  },
  {
    scriptId: "rdp-vuln-ms12-020",
    title: "RDP MS12-020 Vulnerability Detected",
    riskLevel: "high",
    cve: "CVE-2012-0002",
    source: "NVD / NSE rdp-vuln-ms12-020",
    referenceUrl: nvdUrl("CVE-2012-0002"),
    description: (output, serviceLabel) => `${serviceLabel} appears vulnerable to the MS12-020 Remote Desktop flaw. ${truncate(output)}`,
    recommendation: () => "Apply the Microsoft MS12-020 update, restrict RDP exposure, and enforce VPN or jump-host access only.",
  },
]

function addFinding(findings: RiskFinding[], emitted: Set<string>, key: string, finding: RiskFinding) {
  if (emitted.has(key)) return
  emitted.add(key)
  findings.push(finding)
}

function buildScriptFinding({
  scanId,
  assetId,
  service,
  port,
  script,
  discoveredAt,
}: {
  scanId: string
  assetId: string
  service: string
  port: number
  script: NmapScriptResult
  discoveredAt: string
}) {
  const output = script.output.trim()
  const serviceLabel = port > 0 ? `${service}/${port}` : service
  const knownTemplate = scriptTemplates.find((template) => template.scriptId === script.id)
  const positiveSignal = hasPositiveVulnerabilitySignal(output)
  const negativeSignal = hasNegativeVulnerabilitySignal(output)

  if (negativeSignal && !positiveSignal) return null

  if (knownTemplate) {
    return {
      id: makeId("finding"),
      scanId,
      assetId,
      title: knownTemplate.title,
      cve: knownTemplate.cve,
      cveUrl: knownTemplate.cve ? nvdUrl(knownTemplate.cve) : undefined,
      cwe: knownTemplate.cwe,
      cweUrl: knownTemplate.cwe ? cweUrl(knownTemplate.cwe) : undefined,
      service,
      port,
      riskLevel: knownTemplate.riskLevel,
      description: knownTemplate.description(output, serviceLabel),
      recommendation: knownTemplate.recommendation(output),
      source: knownTemplate.source,
      referenceUrl: knownTemplate.referenceUrl,
      status: "open" as const,
      discoveredAt,
    }
  }

  const genericCve = extractCve(output)
  const genericTitle = positiveSignal || genericCve
    ? `${script.id.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())} Result`
    : null

  if (!genericTitle) return null

  return {
    id: makeId("finding"),
    scanId,
    assetId,
    title: genericTitle,
    cve: genericCve,
    cveUrl: genericCve ? nvdUrl(genericCve) : undefined,
    cwe: genericCve ? undefined : "CWE-693",
    cweUrl: genericCve ? undefined : cweUrl("CWE-693"),
    service,
    port,
    riskLevel: deriveGenericRisk(output),
    description: `${serviceLabel} returned an NSE vulnerability-related script result from ${script.id}. ${truncate(output)}`,
    recommendation: "Review the linked NSE script output and referenced CVE, validate the affected component version, apply vendor patches, and reduce exposure of the affected service until remediation is complete.",
    source: `Nmap NSE ${script.id}`,
    referenceUrl: genericCve ? nvdUrl(genericCve) : undefined,
    status: "open" as const,
    discoveredAt,
  }
}

export function buildFindingsForAssets(scanId: string, assets: Asset[]): RiskFinding[] {
  const discoveredAt = nowIso()
  const emitted = new Set<string>()
  const findings: RiskFinding[] = []

  for (const asset of assets) {
    for (const service of asset.services) {
      const context: ServiceContext = {
        name: normalize(service.name),
        product: normalize(service.product),
        version: service.version ?? "",
        fingerprint: [normalize(service.name), normalize(service.product), normalize(service.version)].join(" "),
        port: service.port,
      }

      for (const template of templates.filter((entry) => entry.match(context))) {
        addFinding(findings, emitted, `${asset.id}:${service.port}:${template.title}`, {
          id: makeId("finding"),
          scanId,
          assetId: asset.id,
          title: template.title,
          cve: template.cve,
          cveUrl: template.cve ? nvdUrl(template.cve) : undefined,
          cwe: template.cwe,
          cweUrl: template.cwe ? cweUrl(template.cwe) : undefined,
          service: service.name,
          port: service.port,
          riskLevel: template.riskLevel,
          description: template.description(context),
          recommendation: template.recommendation(context),
          source: template.source,
          referenceUrl: template.referenceUrl,
          status: "open",
          discoveredAt,
        })
      }

      for (const script of service.scripts ?? []) {
        const finding = buildScriptFinding({
          scanId,
          assetId: asset.id,
          service: service.name,
          port: service.port,
          script,
          discoveredAt,
        })
        if (!finding) continue
        addFinding(findings, emitted, `${asset.id}:${service.port}:${script.id}:${finding.title}`, finding)
      }
    }

    for (const script of asset.hostScripts ?? []) {
      const finding = buildScriptFinding({
        scanId,
        assetId: asset.id,
        service: "hostscript",
        port: 0,
        script,
        discoveredAt,
      })
      if (!finding) continue
      addFinding(findings, emitted, `${asset.id}:host:${script.id}:${finding.title}`, finding)
    }
  }

  return findings
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

const fallbackCweByTitle: Array<{ match: RegExp; cwe: string }> = [
  { match: /rpc service exposed/i, cwe: "CWE-668" },
  { match: /netbios exposure detected/i, cwe: "CWE-200" },
  { match: /tftp service enabled/i, cwe: "CWE-306" },
  { match: /vnc service exposed/i, cwe: "CWE-306" },
  { match: /unencrypted http service/i, cwe: "CWE-319" },
  { match: /tls configuration review needed/i, cwe: "CWE-326" },
  { match: /dns service zone transfer review/i, cwe: "CWE-200" },
  { match: /snmp configuration risk/i, cwe: "CWE-798" },
  { match: /ldap directory exposure/i, cwe: "CWE-200" },
  { match: /kerberos service exposure/i, cwe: "CWE-284" },
  { match: /nfs service exposed/i, cwe: "CWE-284" },
]

export function inferCweFallback(finding: Pick<RiskFinding, "title" | "cve" | "cwe">) {
  if (finding.cve) return null
  if (finding.cwe) return finding.cwe
  return fallbackCweByTitle.find((entry) => entry.match.test(finding.title))?.cwe ?? "CWE-693"
}

export function inferCweUrl(cwe?: string | null) {
  return cwe ? cweUrl(cwe) : undefined
}



