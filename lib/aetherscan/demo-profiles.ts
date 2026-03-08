import type { Asset, AssetService } from "@/lib/aetherscan/types"

function svc(
  port: number,
  name: string,
  product?: string,
  version?: string,
): AssetService {
  return { port, protocol: "tcp", name, product, version, state: "open" }
}

export const demoProfiles: Record<string, Omit<Asset, "id" | "discoveredAt" | "lastSeenAt">[]> = {
  "demo-hq": [
    {
      ipAddress: "192.168.1.45",
      hostname: "legacy-admin-pc",
      os: "Windows 10",
      status: "up",
      services: [svc(23, "telnet"), svc(80, "http", "Apache", "2.4.49"), svc(445, "microsoft-ds")],
    },
    {
      ipAddress: "192.168.1.55",
      hostname: "fileserver-01",
      os: "Ubuntu 22.04",
      status: "up",
      services: [svc(21, "ftp", "vsftpd", "3.0.3"), svc(22, "ssh", "OpenSSH", "8.2p1"), svc(443, "https", "nginx", "1.18.0")],
    },
    {
      ipAddress: "192.168.1.15",
      hostname: "printer-core",
      os: "Embedded Linux",
      status: "up",
      services: [svc(80, "http"), svc(161, "snmp")],
    },
  ],
  "demo-lab": [
    {
      ipAddress: "10.10.10.21",
      hostname: "lab-vuln-box",
      os: "Ubuntu 20.04",
      status: "up",
      services: [svc(21, "ftp"), svc(23, "telnet"), svc(53, "domain"), svc(80, "http"), svc(445, "microsoft-ds")],
    },
    {
      ipAddress: "10.10.10.22",
      hostname: "lab-web",
      os: "Debian",
      status: "up",
      services: [svc(22, "ssh", "OpenSSH", "8.2p1"), svc(443, "https"), svc(3306, "mysql", "MySQL", "5.7")],
    },
  ],
  "demo-branch": [
    {
      ipAddress: "192.168.2.20",
      hostname: "branch-gateway",
      os: "Linux",
      status: "up",
      services: [svc(22, "ssh"), svc(80, "http"), svc(443, "https")],
    },
    {
      ipAddress: "192.168.2.35",
      hostname: "branch-share",
      os: "Windows Server 2016",
      status: "up",
      services: [svc(445, "microsoft-ds"), svc(3389, "ms-wbt-server")],
    },
  ],
}
