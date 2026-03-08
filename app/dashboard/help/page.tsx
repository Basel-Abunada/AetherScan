"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  HelpCircle,
  Book,
  MessageCircle,
  Mail,
  Phone,
  Search,
  ExternalLink,
  Shield,
  Scan,
  AlertTriangle,
  FileText,
} from "lucide-react"
import Link from "next/link"

const faqs = [
  {
    question: "How do I run my first network scan?",
    answer:
      "Navigate to the Scan Schedules page and click 'Run On-Demand Scan' or 'New Schedule'. Select an agent, configure scan parameters, and click run. The scan will execute and results will appear on the dashboard.",
  },
  {
    question: "What do the risk levels (High, Medium, Low) mean?",
    answer:
      "High risk vulnerabilities require immediate attention as they can be actively exploited. Medium risk issues should be addressed in your regular patching cycle. Low risk findings are informational or have minimal security impact.",
  },
  {
    question: "How do I follow the remediation steps?",
    answer:
      "Click on any vulnerability to view detailed information and remediation steps. Follow the recommended actions which include specific commands and configuration changes to resolve the issue.",
  },
  {
    question: "What is an Agent and how does it work?",
    answer:
      "An Agent is a lightweight scanning component installed on a machine within your network. It executes Nmap scans and sends results to the central server. Each agent can scan its assigned IP range.",
  },
  {
    question: "How often should I run network scans?",
    answer:
      "We recommend daily scans for critical infrastructure and weekly scans for general networks. You can configure scheduled scans based on your security requirements and network size.",
  },
  {
    question: "Can I export scan results for compliance audits?",
    answer:
      "Yes, you can generate PDF or CSV reports from the Reports page. Reports include vulnerability details, asset inventory, and remediation recommendations suitable for compliance documentation.",
  },
  {
    question: "What permissions do different user roles have?",
    answer:
      "Administrators have full access. Network Engineers can schedule scans and view results. Technicians/Interns can view results and follow remediation guides but cannot modify system settings.",
  },
  {
    question: "How do I add a new scanning agent?",
    answer:
      "Go to the Agents page and click 'Add Agent'. Provide agent details and follow the installation instructions. You'll need to run the provided command on the target machine to install the agent.",
  },
]

const quickLinks = [
  {
    title: "Getting Started Guide",
    description: "Learn the basics of AetherScan",
    icon: Book,
    href: "#",
  },
  {
    title: "Understanding Vulnerabilities",
    description: "Learn about CVE ratings and risk levels",
    icon: AlertTriangle,
    href: "#",
  },
  {
    title: "Scan Configuration",
    description: "Configure scan types and schedules",
    icon: Scan,
    href: "#",
  },
  {
    title: "Report Generation",
    description: "Create and export security reports",
    icon: FileText,
    href: "#",
  },
]

export default function HelpPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-muted-foreground">
            Find answers and get assistance with AetherScan
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for help topics..."
              className="pl-10 h-12 text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Card key={link.title} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <Link href={link.href} className="block">
                <div className="flex items-start gap-4">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">
                    <link.icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-medium flex items-center gap-1">
                      {link.title}
                      <ExternalLink className="size-3" />
                    </h3>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* FAQ Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="size-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Find answers to common questions about AetherScan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Contact Support */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="size-5" />
                Contact Support
              </CardTitle>
              <CardDescription>
                Need more help? Reach out to our team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Mail className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email Support</p>
                  <a
                    href="mailto:support@nozom.com"
                    className="text-sm text-primary hover:underline"
                  >
                    support@nozom.com
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Phone className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Phone Support</p>
                  <p className="text-sm text-muted-foreground">+966 11 XXX XXXX</p>
                </div>
              </div>
              <Button className="w-full mt-4">
                <MessageCircle className="mr-2 size-4" />
                Open Support Ticket
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <Badge variant="secondary">v1.0.0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Build</span>
                <span className="text-sm">2025.03.08</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nmap Version</span>
                <span className="text-sm">7.94</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Database</span>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Connected
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="#">
                  <Book className="mr-2 size-4" />
                  User Manual
                  <ExternalLink className="ml-auto size-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="#">
                  <Shield className="mr-2 size-4" />
                  Security Guidelines
                  <ExternalLink className="ml-auto size-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="#">
                  <FileText className="mr-2 size-4" />
                  API Documentation
                  <ExternalLink className="ml-auto size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
