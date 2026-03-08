"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface RiskDistributionChartProps {
  counts: { high: number; medium: number; low: number }
}

export function RiskDistributionChart({ counts }: RiskDistributionChartProps) {
  const data = [
    { name: "High", value: counts.high, color: "#dc2626" },
    { name: "Medium", value: counts.medium, color: "#d97706" },
    { name: "Low", value: counts.low, color: "#16a34a" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Distribution</CardTitle>
        <CardDescription>Vulnerability severity breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-md">
                        <p className="text-sm font-medium">{payload[0].name}</p>
                        <p className="text-sm text-muted-foreground">{payload[0].value} vulnerabilities</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          {data.map((item) => (
            <div key={item.name}>
              <p className="text-2xl font-bold" style={{ color: item.color }}>
                {item.value}
              </p>
              <p className="text-xs text-muted-foreground">{item.name} Risk</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
