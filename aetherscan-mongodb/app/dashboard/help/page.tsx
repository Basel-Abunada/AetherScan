"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Book,
  ExternalLink,
  FileText,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  Scan,
  Search,
  Shield,
  Wrench,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

const SUPPORT_EMAIL = "XXX@XXXX.XXX"
const SUPPORT_PHONE = "+XX XX XXX XXXX"
const SUPPORT_PHONE_LINK = "tel:+000000000000"
const SUPPORT_EMAIL_LINK = "mailto:XXX@XXXX.XXX"

const guides = [
  {
    id: "getting-started",
    title: "Getting Started Guide",
    description: "Learn the basics of AetherScan and move from login to your first scan quickly.",
    icon: Book,
    ctaLabel: "Open guide",
    sections: [
      "Sign in with your assigned role and verify the dashboard loads successfully.",
      "Register at least one scanning agent from the Agents page and copy the generated token to the agent host.",
      "Open Scan Schedules, use Queue Scan for an immediate run, and choose your preferred scan profile.",
      "Review completed results from Scan Results, then inspect findings from Vulnerabilities and Reports.",
    ],
    link: "/dashboard/scans",
  },
  {
    id: "vulnerabilities",
    title: "Understanding Vulnerabilities",
    description: "Interpret risk ratings, CVE mapping, remediation status, and follow-up workflow.",
    icon: AlertTriangle,
    ctaLabel: "Review vulnerability guide",
    sections: [
      "High risk findings need immediate action, medium risk findings should be scheduled, and low risk findings are informational only.",
      "Use the Remediate action to review the description, recommendation, source, and any attached CVE references.",
      "Mark a finding as In Progress during remediation and Resolved once the issue has been addressed and verified.",
      "Deleting a finding removes it from the vulnerability list and associated dashboard risk alerts.",
    ],
    link: "/dashboard/vulnerabilities",
  },
  {
    id: "scan-configuration",
    title: "Scan Configuration",
    description: "Configure agents, scan types, schedules, and user-specific defaults correctly.",
    icon: Scan,
    ctaLabel: "Open scan configuration",
    sections: [
      "Quick, Standard, Advanced, and Vulnerability scans are available depending on the depth required.",
      "Each user can define a personal default scan type in Settings > System without changing other users' preferences.",
      "Recurring schedules are linked to the user who created them, while manual scans are queued immediately when the agent polls the server.",
      "Use a reachable target, an online agent, and the correct scan profile to avoid false failures.",
    ],
    link: "/dashboard/settings",
  },
  {
    id: "report-generation",
    title: "Report Generation",
    description: "Create PDF or CSV outputs for results, asset inventories, and vulnerability summaries.",
    icon: FileText,
    ctaLabel: "Open report guide",
    sections: [
      "Generate reports from the Reports page or export scan results directly from the Results page.",
      "Auto-generate Reports is a per-user system preference and applies to scans created by that specific user.",
      "PDF output is better for management review, while CSV is better for tracking and external analysis.",
      "Only administrators can delete reports, but users can still generate and download their own outputs.",
    ],
    link: "/dashboard/reports",
  },
  {
    id: "user-manual",
    title: "User Manual",
    description: "Get a structured walkthrough of installation, login, agents, scans, results, and reports.",
    icon: Book,
    ctaLabel: "Open manual overview",
    sections: [
      "Install the web application on Windows and the agent on Linux or Kali.",
      "Configure MongoDB, SMTP, and agent connection settings before running live scans.",
      "Use the dashboard pages in this order: Agents, Scan Schedules, Scan Results, Vulnerabilities, and Reports.",
      "Refer to Settings for account, notification, email, password, and user-specific scan preferences.",
    ],
    link: "/dashboard/help",
  },
  {
    id: "security-guidelines",
    title: "Security Guidelines",
    description: "Follow secure operating practices when using agents, passwords, SMTP, and shared dashboards.",
    icon: Shield,
    ctaLabel: "View security guidelines",
    sections: [
      "Use strong passwords and never share scanning accounts between multiple team members.",
      "Run scanning agents only on authorized internal hosts and store agent tokens securely.",
      "Use app passwords or dedicated SMTP credentials instead of personal mailbox passwords whenever possible.",
      "Review high-risk findings promptly and limit admin-only actions such as deleting reports or changing other users.",
    ],
    link: "/dashboard/settings",
  },
  {
    id: "api-documentation",
    title: "API Documentation",
    description: "Understand the main endpoints used by the dashboard, agents, and report generation flows.",
    icon: Wrench,
    ctaLabel: "Open API notes",
    sections: [
      "Agent communication relies on /api/agents/heartbeat, /api/agents/jobs, and /api/submit-scan.",
      "Dashboard pages rely on resource endpoints such as /api/scans, /api/vulnerabilities, /api/assets, and /api/reports.",
      "Authentication and session management are handled by /api/auth/login, /api/auth/password, and /api/auth/sessions.",
      "Settings and email test behavior are handled by /api/settings and /api/settings/test-email.",
    ],
    link: "/api/health",
  },
] as const

const faqs = [
  {
    question: "How do I run my first network scan?",
    answer:
      "Open Scan Schedules, click Queue Scan, select an online agent, set the target, choose the scan type, and submit the job. The scan status will update automatically in the Results page when the agent starts and completes the run.",
  },
  {
    question: "What do the risk levels mean?",
    answer:
      "High risk findings indicate exposures that require immediate review. Medium risk findings should be remediated in the normal security cycle. Low risk findings are informational and should be validated before any change is made.",
  },
  {
    question: "How do per-user settings work now?",
    answer:
      "System defaults and email configuration are now saved per user. Your default scan type, auto-generated reports, data retention, and SMTP setup apply only to your own account and your own scans.",
  },
  {
    question: "Why did I not receive an email after a scan?",
    answer:
      "Make sure Email Notifications is enabled in your own settings, your SMTP configuration is saved successfully, and the scan was created by your account. Scan emails are now sent only to the user who created the scan.",
  },
  {
    question: "What is an agent and how does it work?",
    answer:
      "An agent is the execution host that polls the server for jobs, runs Nmap-based scans, and submits results back to AetherScan. The dashboard only manages and displays the workflow; the agent performs the actual scan execution.",
  },
  {
    question: "Can I export results for audit or reporting purposes?",
    answer:
      "Yes. Use the Reports page for structured PDF and CSV outputs, or export scan results directly from the Results page. The generated files include scan context, findings, and related remediation details.",
  },
  {
    question: "What should I do when a finding is marked high risk?",
    answer:
      "Open the remediation dialog from the Vulnerabilities page, review the description and recommendation, then mark it In Progress while remediation is underway. After verification, mark it Resolved to reflect the final state.",
  },
  {
    question: "How do I add a new scanning agent?",
    answer:
      "Go to Agents, click Add Agent, complete the registration form, and copy the generated token and command. Then run the command on the Linux or Kali agent host so it can authenticate and poll the AetherScan server.",
  },
]

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGuideId, setSelectedGuideId] = useState<(typeof guides)[number]["id"] | null>(null)
  const [ticketSubject, setTicketSubject] = useState("AetherScan support request")
  const [ticketDetails, setTicketDetails] = useState("")
  const [health, setHealth] = useState<{ ok: boolean; database?: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadHealth = async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" })
        const data = await response.json()
        if (!cancelled) setHealth({ ok: Boolean(data.ok), database: data.database })
      } catch {
        if (!cancelled) setHealth({ ok: false })
      }
    }

    void loadHealth()
    return () => {
      cancelled = true
    }
  }, [])

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredGuides = useMemo(() => {
    if (!normalizedSearch) return guides
    return guides.filter((guide) =>
      [guide.title, guide.description, ...guide.sections].some((entry) => entry.toLowerCase().includes(normalizedSearch)),
    )
  }, [normalizedSearch])

  const filteredFaqs = useMemo(() => {
    if (!normalizedSearch) return faqs
    return faqs.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(normalizedSearch))
  }, [normalizedSearch])

  const selectedGuide = guides.find((guide) => guide.id === selectedGuideId) ?? null

  const openGuide = (guideId: (typeof guides)[number]["id"]) => {
    setSelectedGuideId(guideId)
  }

  const openSupportTicket = () => {
    const params = new URLSearchParams({
      subject: ticketSubject,
      body: ticketDetails || "Please describe the issue, the page affected, and the exact error message if available.",
    })
    window.location.href = `${SUPPORT_EMAIL_LINK}?${params.toString()}`
  }

  const copyContact = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-primary/5 p-6 shadow-sm">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.14),transparent_65%)] lg:block" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge variant="outline" className="bg-primary/5 text-primary">Support Hub</Badge>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
              <p className="mt-2 text-muted-foreground">
                Search guides, open support contact options, review live platform status, and jump directly into the exact workflow you need.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={SUPPORT_EMAIL_LINK}>
                <Mail className="mr-2 size-4" />
                Email Support
              </a>
            </Button>
            <Button asChild>
              <a href={SUPPORT_PHONE_LINK}>
                <Phone className="mr-2 size-4" />
                Call Support
              </a>
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-primary/10 shadow-sm">
        <CardContent className="pt-6">
          <div className="relative mx-auto max-w-3xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search guides, settings, vulnerabilities, reports, or support topics..."
              className="h-12 pl-10 text-base"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>{filteredGuides.length} guides</span>
            <span>•</span>
            <span>{filteredFaqs.length} FAQ matches</span>
            <span>•</span>
            <span>{health?.ok ? "Platform healthy" : "Health check unavailable"}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {filteredGuides.slice(0, 4).map((guide) => (
          <Card key={guide.id} className="group border-primary/10 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="pt-6">
              <button type="button" onClick={() => openGuide(guide.id)} className="w-full text-left">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <guide.icon className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold">
                      {guide.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{guide.description}</p>
                    <div className="inline-flex items-center gap-1 text-sm text-primary">
                      {guide.ctaLabel}
                      <ExternalLink className="size-3.5" />
                    </div>
                  </div>
                </div>
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="size-5" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>Answers to the operational questions your team will hit most often.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem key={faq.question} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {filteredFaqs.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                No FAQ matched your search. Try broader terms like <span className="font-medium text-foreground">scan</span>, <span className="font-medium text-foreground">agent</span>, or <span className="font-medium text-foreground">email</span>.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="size-5" />
                Contact Support
              </CardTitle>
              <CardDescription>Use placeholder contact details for now and keep the workflow ready for real support later.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <Mail className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Email Support</p>
                    <a href={SUPPORT_EMAIL_LINK} className="text-sm text-primary hover:underline">{SUPPORT_EMAIL}</a>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => void copyContact(SUPPORT_EMAIL, "Support email")}>Copy</Button>
                </div>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <Phone className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Phone Support</p>
                    <a href={SUPPORT_PHONE_LINK} className="text-sm text-primary hover:underline">{SUPPORT_PHONE}</a>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => void copyContact(SUPPORT_PHONE, "Support phone")}>Copy</Button>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <MessageCircle className="mr-2 size-4" />
                    Open Support Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Open Support Ticket</DialogTitle>
                    <DialogDescription>Prepare a support email with enough detail for triage and follow-up.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ticket-subject">Subject</Label>
                      <Input id="ticket-subject" value={ticketSubject} onChange={(event) => setTicketSubject(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticket-details">Issue Details</Label>
                      <Textarea
                        id="ticket-details"
                        rows={8}
                        value={ticketDetails}
                        onChange={(event) => setTicketDetails(event.target.value)}
                        placeholder="Describe the page, action, expected result, actual result, and any error message."
                      />
                    </div>
                    <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                      The ticket will open your default mail app addressed to <span className="font-medium text-foreground">{SUPPORT_EMAIL}</span>.
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setTicketSubject("AetherScan support request"); setTicketDetails("") }}>
                      Reset
                    </Button>
                    <Button onClick={openSupportTicket}>
                      <Mail className="mr-2 size-4" />
                      Open Email Draft
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5" />
                System Information
              </CardTitle>
              <CardDescription>Useful live context when you are troubleshooting platform issues.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <Badge variant="secondary">v1.0.0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Build</span>
                <span className="text-sm">2026.03.21</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nmap Integration</span>
                <span className="text-sm">7.x compatible</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Database</span>
                <Badge variant="outline" className={health?.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                  {health?.ok ? health.database ?? "Connected" : "Unavailable"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
          <CardDescription>Open focused guidance for the exact area of AetherScan you want to work on.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {guides.map((guide) => (
            <Button key={guide.id} variant="outline" className="h-auto justify-start py-4 text-left" onClick={() => openGuide(guide.id)}>
              <guide.icon className="mr-3 size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{guide.title}</span>
                <span className="block text-xs text-muted-foreground">{guide.description}</span>
              </span>
              <ExternalLink className="ml-3 size-4 shrink-0" />
            </Button>
          ))}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedGuide)} onOpenChange={(open) => { if (!open) setSelectedGuideId(null) }}>
        <DialogContent className="max-w-3xl">
          {selectedGuide ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <selectedGuide.icon className="size-5 text-primary" />
                  {selectedGuide.title}
                </DialogTitle>
                <DialogDescription>{selectedGuide.description}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4">
                  {selectedGuide.sections.map((section) => (
                    <div key={section} className="rounded-2xl border bg-muted/20 p-4 text-sm leading-6">
                      {section}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="outline" onClick={() => setSelectedGuideId(null)}>Close</Button>
                <Button asChild>
                  <Link href={selectedGuide.link}>
                    Open Related Page
                    <ExternalLink className="ml-2 size-4" />
                  </Link>
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
