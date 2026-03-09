"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, ScanSearch } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import type { ScanResult } from "@/lib/aetherscan/types"
import { formatDateTime, scanTypeLabel } from "@/lib/aetherscan-client"

interface RecentScansTableProps {
  scans: ScanResult[]
}

export function RecentScansTable({ scans }: RecentScansTableProps) {
  if (!scans.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No scans yet. Run a scan to populate this table.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Scan Time</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-center">Hosts</TableHead>
          <TableHead className="text-center">High</TableHead>
          <TableHead className="text-center">Medium</TableHead>
          <TableHead className="text-center">Low</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scans.map((scan) => (
          <TableRow key={scan.id}>
            <TableCell className="font-medium">{scan.agentName}</TableCell>
            <TableCell className="text-muted-foreground">{formatDateTime(scan.completedAt ?? scan.startedAt)}</TableCell>
            <TableCell>
              <Badge variant="outline">{scanTypeLabel(scan.scanType)}</Badge>
            </TableCell>
            <TableCell className="text-center">{scan.totalHosts}</TableCell>
            <TableCell className="text-center">
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                {scan.vulnerabilities.high}
              </span>
            </TableCell>
            <TableCell className="text-center">
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                {scan.vulnerabilities.medium}
              </span>
            </TableCell>
            <TableCell className="text-center">
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                {scan.vulnerabilities.low}
              </span>
            </TableCell>
            <TableCell>
              <Badge
                variant={scan.status === "completed" ? "secondary" : scan.status === "failed" ? "destructive" : "outline"}
                className={scan.status === "completed" ? "bg-green-100 text-green-700 border-green-200" : ""}
              >
                {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/results">
                      <ScanSearch className="mr-2 size-4" />
                      View in results
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

