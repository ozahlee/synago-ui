"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { legendProps, tooltipProps } from "@/lib/chart"
import { money } from "@/lib/format"
import type { Budget } from "@/lib/types"

export function BudgetOverview({ budgets }: { budgets: Budget[] }) {
  const totalBudget = budgets.reduce((sum, b) => sum + b.allocated, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const percentageSpent = totalBudget ? (totalSpent / totalBudget) * 100 : 0
  const chartData = budgets.map((b, i) => ({ name: b.category, value: b.allocated, color: `var(--chart-${(i % 5) + 1})` }))

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Budget</span>
              <span className="text-2xl font-semibold tabular">{money(totalBudget)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Spent</span>
              <span className="text-2xl font-semibold tabular text-chart-5">{money(totalSpent)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className={`text-2xl font-semibold tabular ${totalBudget - totalSpent >= 0 ? "text-success" : "text-destructive"}`}>
                {money(totalBudget - totalSpent)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{percentageSpent.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(percentageSpent, 100)} className="h-3" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Where it goes</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none" dataKey="value">
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => money(value)} {...tooltipProps} />
              <Legend {...legendProps} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
