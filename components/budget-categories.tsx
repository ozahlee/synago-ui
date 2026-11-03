"use client"

import { useState } from "react"
import { mutate } from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2, AlertTriangle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BudgetFormDialog } from "@/components/budget-form-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { runAction } from "@/components/form"
import { del } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { money } from "@/lib/format"
import type { Budget } from "@/lib/types"

export const refreshBudgets = () => mutate((key) => typeof key === "string" && key.startsWith("/budgets"))

const STATUS_STYLE: Record<Budget["status"], { text: string; label: string }> = {
  "on-track": { text: "text-success", label: "On track" },
  warning: { text: "text-warning", label: "Near limit" },
  exceeded: { text: "text-destructive", label: "Over budget" },
}

export function BudgetCategories({ budgets, isLoading }: { budgets: Budget[]; isLoading: boolean }) {
  const { can } = useAuth()
  const canManage = can("finance.manage")
  const [selected, setSelected] = useState<Budget | null>(null)
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-6 bg-muted rounded w-1/3" />
                <div className="h-2 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
            {budgets.map((budget) => {
              const percentage = budget.allocated ? (budget.spent / budget.allocated) * 100 : 0
              const remaining = budget.allocated - budget.spent
              const style = STATUS_STYLE[budget.status]

              return (
                <div key={budget.id} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{budget.category}</h4>
                        {budget.status !== "on-track" && <AlertTriangle className={`h-4 w-4 ${style.text}`} />}
                      </div>
                      <Badge variant={budget.status === "on-track" ? "success" : budget.status === "warning" ? "warning" : "danger"}>
                        {style.label}
                      </Badge>
                    </div>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => (setSelected(budget), setDialog("edit"))}>
                            <Pencil className="size-4" />
                            Edit Allocation
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => (setSelected(budget), setDialog("delete"))}>
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground tabular">
                        {money(budget.spent)} of {money(budget.allocated)}
                      </span>
                      <span className={`font-medium ${style.text}`}>{percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(percentage, 100)} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {remaining >= 0 ? "Remaining: " : "Over by: "}
                      <span className={`font-medium ${remaining >= 0 ? "text-success" : "text-destructive"}`}>
                        {money(Math.abs(remaining))}
                      </span>
                      {budget.notes && <span> · {budget.notes}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <>
          <BudgetFormDialog key={`edit-${selected.id}`} budget={selected} open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} />
          <ConfirmDialog
            open={dialog === "delete"}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Delete Budget Category"
            description={
              <>
                Delete the <span className="font-semibold">{selected.category}</span> budget for {selected.period}? Recorded
                expenses are not affected.
              </>
            }
            onConfirm={async () => {
              const ok = await runAction(() => del(`/budgets/${selected.id}`), "Budget deleted")
              if (ok) refreshBudgets()
              return ok
            }}
          />
        </>
      )}
    </>
  )
}
