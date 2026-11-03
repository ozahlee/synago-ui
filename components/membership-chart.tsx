"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { tooltipProps } from "@/lib/chart"

export function MembershipChart({ data }: { data: { male: number; female: number } }) {
  const total = data.male + data.female
  const slices = [
    { name: "Men", value: data.male, color: "var(--chart-1)" },
    { name: "Women", value: data.female, color: "var(--chart-2)" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Our congregation</CardTitle>
        <CardDescription>Members by gender</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
        <div className="relative size-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={slices} dataKey="value" innerRadius="70%" outerRadius="100%" paddingAngle={total ? 3 : 0} stroke="none">
                {slices.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip {...tooltipProps} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-semibold tabular">{total.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">members</span>
          </div>
        </div>
        <div className="w-full space-y-4">
          {slices.map((s) => {
            const pct = total ? Math.round((s.value / total) * 100) : 0
            return (
              <div key={s.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <span className="tabular text-muted-foreground">
                    <span className="font-semibold text-foreground">{s.value.toLocaleString()}</span> · {pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
