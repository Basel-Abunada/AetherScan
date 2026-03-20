import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AetherScan - Network Security Scanner",
  description: "Web-Based Automated Internal Network Scanner with Risk Detection and Alerts",
  generator: "v0.app",
  icons: {
    icon: "/aetherscan-mark.svg",
    shortcut: "/aetherscan-mark.svg",
    apple: "/aetherscan-mark.svg",
  },
}

const themeBootstrapScript = `
(() => {
  try {
    const sessionRaw = window.localStorage.getItem("aetherscan-session")
    const sessionTheme = sessionRaw ? JSON.parse(sessionRaw)?.user?.theme : null
    const storedTheme = window.localStorage.getItem("aetherscan-theme")
    const theme = storedTheme || sessionTheme || "system"
    const resolvedTheme = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
    document.documentElement.style.colorScheme = resolvedTheme
  } catch {}
})()
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
