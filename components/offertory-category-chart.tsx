"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { HandCoins } from "lucide-react"
import { EmptyState } from "@/components/page"
import { tooltipProps } from "@/lib/chart"
import { money, titleCase } from "@/lib/format"
import { OFFERTORY_CATEGORIES, type OffertorySummary } from "@/lib/types"

export function OffertoryCategoryChart({ summary, periodLabel = "This month" }: { summary?: OffertorySummary; periodLabel?: string }) {
  const data = OFFERTORY_CATEGORIES.map((c, i) => ({
    name: titleCase(c),
    value: summary?.byCategory[c].total ?? 0,
    color: `var(--chart-${i + 1})`,
  }))
  const total = summary?.total ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{periodLabel} by category</CardTitle>
        <CardDescription>How the offerings in this period are made up</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState icon={HandCoins} title="No offerings in this period" description="Recorded offerings will be broken down here." className="py-8" />
        ) : (
          <div className="flex flex-col items-center gap-10 md:flex-row md:justify-center">
            <div className="relative size-52 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="none" dataKey="value">
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => money(v)} {...tooltipProps} />
              </PieChart>
            </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="px-6 text-center font-display text-base font-semibold tabular">{money(total)}</span>
              </div>
            </div>
            <div className="w-full space-y-3 md:max-w-sm">
              {data.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium tabular">
                    {money(item.value)} <span className="text-muted-foreground">({((item.value / total) * 100).toFixed(0)}%)</span>
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular">{money(total)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
