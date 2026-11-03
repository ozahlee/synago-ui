"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FieldError, num, str, useApiForm } from "@/components/form"
import { refreshAccounts } from "@/components/transactions-table"
import { patch, post, useApi } from "@/lib/api"
import { CURRENCY, today } from "@/lib/format"
import { PAYMENT_METHODS, TRANSACTION_CATEGORIES, type Project, type Transaction } from "@/lib/types"

type TransactionFormDialogProps = {
  transaction?: Transaction
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType?: "income" | "expense"
}

export function TransactionFormDialog({ transaction, open, onOpenChange, defaultType = "income" }: TransactionFormDialogProps) {
  const isEdit = !!transaction
  const [type, setType] = useState<"income" | "expense">(transaction?.type ?? defaultType)
  // Keep an existing custom category selectable when editing.
  const categories = Array.from(
    new Set([...TRANSACTION_CATEGORIES[type], ...(transaction?.type === type ? [transaction.category] : [])]),
  )

  const { data: projects = [] } = useApi<Project[]>(open ? "/projects" : null)
  const [projectId, setProjectId] = useState(transaction?.projectId ?? "none")

  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const body = {
      type,
      category: str(fd, "category"),
      description: str(fd, "description"),
      amount: num(fd, "amount"),
      date: str(fd, "date"),
      paymentMethod: str(fd, "paymentMethod"),
      reference: str(fd, "reference"),
      payee: type === "expense" ? str(fd, "payee") : null,
      projectId: projectId === "none" ? null : Number(projectId),
    }
    if (isEdit) await patch(`/accounts/${transaction.id}`, body)
    else await post("/accounts", body)
    refreshAccounts()
    onOpenChange(false)
  }, isEdit ? "Transaction updated" : `${type === "income" ? "Income" : "Expense"} recorded`)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
          <DialogDescription>Record income or an expense. Expenses count against the matching budget category.</DialogDescription>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expense">Expense</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="t-category">Category</Label>
              <Select key={type} name="category" defaultValue={transaction?.type === type ? transaction.category : undefined} required>
                <SelectTrigger id="t-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError error={error} name="category" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="t-description">Description</Label>
              <Textarea id="t-description" name="description" rows={2} defaultValue={transaction?.description} required />
              <FieldError error={error} name="description" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="t-amount">Amount ({CURRENCY})</Label>
                <Input id="t-amount" name="amount" type="number" min="0.01" step="0.01" defaultValue={transaction?.amount} required />
                <FieldError error={error} name="amount" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-date">Date</Label>
                <Input id="t-date" name="date" type="date" defaultValue={transaction?.date ?? today()} required />
                <FieldError error={error} name="date" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="t-method">Payment Method</Label>
              <Select name="paymentMethod" defaultValue={transaction?.paymentMethod ?? "Cash"}>
                <SelectTrigger id="t-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === "expense" && (
              <div className="space-y-2">
                <Label htmlFor="t-payee">Vendor/Payee (optional)</Label>
                <Input id="t-payee" name="payee" placeholder="Who received the payment" defaultValue={transaction?.payee ?? ""} />
              </div>
            )}

            {projects.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="t-project">Project (optional)</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="t-project" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not for a project</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="t-ref">Reference Number (optional)</Label>
              <Input id="t-ref" name="reference" placeholder="Auto-generated if left blank" defaultValue={transaction?.reference} />
              <FieldError error={error} name="reference" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save Changes" : type === "income" ? "Add Income" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
