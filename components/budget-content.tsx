"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, AlertCircle, PieChart } from "lucide-react"
import { EmptyState, Page, PageHeader } from "@/components/page"
import { BudgetCategories } from "@/components/budget-categories"
import { BudgetFormDialog } from "@/components/budget-form-dialog"
import { BudgetOverview } from "@/components/budget-overview"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { currentPeriod } from "@/lib/format"
import type { Budget } from "@/lib/types"

const periodLabel = (p: string) => {
  const [y, m] = p.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })
}

export function BudgetContent() {
  const { can } = useAuth()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [period, setPeriod] = useState(currentPeriod())
  const { data: budgets = [], isLoading, error } = useApi<Budget[]>(qs("/budgets", { period }))

  const allocated = budgets.reduce((s, b) => s + b.allocated, 0)
  const spent = budgets.reduce((s, b) => s + b.spent, 0)
  const flagged = budgets.filter((b) => b.status !== "on-track")

  return (
    <Page>
      <PageHeader
        eyebrow="Stewardship"
        title="Budget"
        description="Plan each month's spending by category and see how it's going."
        actions={
          <>
            <Label htmlFor="budget-period" className="sr-only">
              Period
            </Label>
            <Input
              id="budget-period"
              type="month"
              value={period}
              onChange={(e) => e.target.value && setPeriod(e.target.value)}
              className="w-44"
            />
            {can("finance.manage") && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="size-4" />
                Add category
              </Button>
            )}
          </>
        }
      />

      {budgets.length > 0 && (
        <Alert variant={flagged.some((b) => b.status === "exceeded") ? "destructive" : "default"} className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Budget Period: {periodLabel(period)}</AlertTitle>
          <AlertDescription>
            You have spent {allocated ? ((spent / allocated) * 100).toFixed(0) : 0}% of your total budget.{" "}
            {flagged.length === 0
              ? "All categories are on track."
              : `${flagged.length} ${flagged.length === 1 ? "category is" : "categories are"} near or over the limit: ${flagged
                  .map((b) => b.category)
                  .join(", ")}.`}
          </AlertDescription>
        </Alert>
      )}

      {error && <p className="text-destructive">{error.message}</p>}

      {!isLoading && budgets.length === 0 ? (
        <div className="rounded-2xl border border-dashed">
          <EmptyState icon={PieChart} title={`No budget for ${periodLabel(period)}`} description="Add categories to plan this month's spending." />
        </div>
      ) : (
        <>
          <BudgetOverview budgets={budgets} />
          <BudgetCategories budgets={budgets} isLoading={isLoading} />
        </>
      )}

      <BudgetFormDialog key={period} defaultPeriod={period} open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </Page>
  )
}
