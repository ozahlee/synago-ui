"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FieldError, num, str, useApiForm } from "@/components/form"
import { refreshBudgets } from "@/components/budget-categories"
import { patch, post } from "@/lib/api"
import { CURRENCY, currentPeriod } from "@/lib/format"
import { TRANSACTION_CATEGORIES, type Budget } from "@/lib/types"

type BudgetFormDialogProps = {
  budget?: Budget
  defaultPeriod?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BudgetFormDialog({ budget, defaultPeriod, open, onOpenChange }: BudgetFormDialogProps) {
  const isEdit = !!budget

  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const body = {
      category: str(fd, "category"),
      allocated: num(fd, "allocated"),
      period: str(fd, "period"),
      notes: str(fd, "notes"),
    }
    if (isEdit) await patch(`/budgets/${budget.id}`, body)
    else await post("/budgets", body)
    refreshBudgets()
    onOpenChange(false)
  }, isEdit ? "Budget updated" : "Budget created")

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Budget" : "Add Budget Category"}</DialogTitle>
          <DialogDescription>
            Spending is tracked automatically from expenses recorded in Accounts with the same category and month.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="b-category">Expense Category</Label>
              <Input id="b-category" name="category" list="expense-categories" defaultValue={budget?.category} required />
              <datalist id="expense-categories">
                {TRANSACTION_CATEGORIES.expense.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <FieldError error={error} name="category" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="b-amount">Allocated ({CURRENCY})</Label>
                <Input id="b-amount" name="allocated" type="number" min="0" step="0.01" defaultValue={budget?.allocated} required />
                <FieldError error={error} name="allocated" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-period">Month</Label>
                <Input id="b-period" name="period" type="month" defaultValue={budget?.period ?? defaultPeriod ?? currentPeriod()} required />
                <FieldError error={error} name="period" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="b-notes">Notes (optional)</Label>
              <Textarea id="b-notes" name="notes" rows={2} defaultValue={budget?.notes ?? ""} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
