"use client"

import { useEffect, useState } from "react"
import { mutate } from "swr"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react"
import { EmptyState, TableCard, TableSkeleton } from "@/components/page"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { TransactionFormDialog } from "@/components/transaction-form-dialog"
import { Pager } from "@/components/pager"
import { runAction } from "@/components/form"
import { del, qs, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { date, money } from "@/lib/format"
import type { Transaction } from "@/lib/types"

/** Accounts feed budgets ("spent"), so refresh both. */
export const refreshAccounts = () =>
  mutate((key) => typeof key === "string" && (key.startsWith("/accounts") || key.startsWith("/budgets")))

export function TransactionsTable({ type, from, to }: { type: string; from?: string | null; to?: string | null }) {
  const { can } = useAuth()
  const canManage = can("finance.manage")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null)

  useEffect(() => setPage(1), [type, from, to])

  const { rows, meta, isLoading, error } = usePaginated<Transaction>(qs("/accounts", { type, from, to, page, perPage: 20 }))

  return (
    <>
      <TableCard title="Ledger" count={meta?.total} footer={meta && meta.total > 0 && <Pager meta={meta} onPage={setPage} />}>
        {error && <p className="px-6 pt-4 text-sm text-destructive">{error.message}</p>}
        {isLoading && !meta ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={Wallet} title="No transactions recorded" description="Income and expenses you record will show here." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="hidden lg:table-cell">Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {canManage && (
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => {
                const income = t.type === "income"
                return (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-normal">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                            income ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {income ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold">{t.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.payee ? `${t.payee} · ` : ""}
                            {t.reference}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="muted">{t.category}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-sm sm:table-cell">{date(t.date)}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{t.paymentMethod ?? "—"}</TableCell>
                    <TableCell className={`text-right font-semibold tabular ${income ? "text-success" : "text-destructive"}`}>
                      {income ? "+" : "−"}
                      {money(t.amount)}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Actions"
                              className="opacity-60 group-hover/row:opacity-100 data-[state=open]:opacity-100"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => (setSelected(t), setDialog("edit"))}>
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => (setSelected(t), setDialog("delete"))}>
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </TableCard>

      {selected && (
        <>
          <TransactionFormDialog
            key={`edit-${selected.id}`}
            transaction={selected}
            open={dialog === "edit"}
            onOpenChange={(o) => !o && setDialog(null)}
          />
          <ConfirmDialog
            open={dialog === "delete"}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Delete transaction"
            description={
              <>
                Delete {selected.type} <span className="font-semibold">{money(selected.amount)}</span> —{" "}
                {selected.description} ({selected.reference})?
              </>
            }
            onConfirm={async () => {
              const ok = await runAction(() => del(`/accounts/${selected.id}`), "Transaction deleted")
              if (ok) refreshAccounts()
              return ok
            }}
          />
        </>
      )}
    </>
  )
}
