"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { money, compact } from "@/lib/format"
import { axisProps, gridProps, legendProps, tooltipProps } from "@/lib/chart"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"

type OffertoryChartProps = {
  data: Array<{ month: string; tithe: number; pledge: number; thanksgiving: number; harvest: number }>
}

const SERIES = [
  { key: "tithe", name: "Tithe", color: "var(--chart-1)" },
  { key: "pledge", name: "Pledge", color: "var(--chart-2)" },
  { key: "thanksgiving", name: "Thanksgiving", color: "var(--chart-3)" },
  { key: "harvest", name: "Harvest", color: "var(--chart-4)" },
] as const

export function OffertoryChart({ data }: OffertoryChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Giving over six months</CardTitle>
        <CardDescription>Tithes, pledges, thanksgiving and harvest, month by month</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barCategoryGap="28%">
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} tickFormatter={compact} width={44} />
            <Tooltip formatter={(v: number) => money(v)} {...tooltipProps} />
            <Legend {...legendProps} />
            {SERIES.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stackId="giving"
                fill={s.color}
                radius={i === SERIES.length - 1 ? [6, 6, 0, 0] : 0}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
