"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useApi } from "@/lib/api"
import { compact, money } from "@/lib/format"
import type { AccountsTrend } from "@/lib/types"
import { axisProps, gridProps, legendProps, tooltipProps } from "@/lib/chart"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"

export function AccountsChart() {
  const { data = [] } = useApi<AccountsTrend[]>("/accounts/trends?months=6")
  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs expenses</CardTitle>
        <CardDescription>Financial trends over the past 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-5)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--chart-5)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} tickFormatter={compact} width={44} />
            <Tooltip formatter={(v: number) => money(v)} {...tooltipProps} />
            <Legend {...legendProps} />
            <Area
              type="monotone"
              dataKey="income"
              stroke="var(--chart-1)"
              fillOpacity={1}
              fill="url(#colorIncome)"
              name="Income"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="var(--chart-5)"
              fillOpacity={1}
              fill="url(#colorExpenses)"
              name="Expenses"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
