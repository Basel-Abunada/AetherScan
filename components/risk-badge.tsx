import { cn } from "@/lib/utils"

type RiskLevel = "high" | "medium" | "low" | "info"

interface RiskBadgeProps {
  level: RiskLevel
  className?: string
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const styles = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-green-100 text-green-700 border-green-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
  }

  const labels = {
    high: "High",
    medium: "Medium",
    low: "Low",
    info: "Info",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        styles[level],
        className
      )}
    >
      {labels[level]}
    </span>
  )
}
