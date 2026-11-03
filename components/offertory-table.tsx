"use client"

import { useEffect, useState } from "react"
import { mutate } from "swr"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2, HandCoins, EyeOff } from "lucide-react"
import { EmptyState, PersonAvatar, TableCard, TableSkeleton } from "@/components/page"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { OffertoryFormDialog } from "@/components/offertory-form-dialog"
import { Pager } from "@/components/pager"
import { runAction } from "@/components/form"
import { del, qs, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { date, money, titleCase } from "@/lib/format"
import type { Offertory } from "@/lib/types"

export const refreshOffertory = () =>
  mutate((key) => typeof key === "string" && (key.startsWith("/offertory") || key === "/dashboard"))

const CATEGORY_COLORS: Record<string, string> = {
  tithe: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  pledge: "bg-chart-2/15 text-gold-foreground border-chart-2/30 dark:text-chart-2",
  thanksgiving: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  harvest: "bg-chart-4/15 text-[color-mix(in_oklch,var(--chart-4)_65%,black)] border-chart-4/30 dark:text-chart-4",
}

export function OffertoryTable({ category, from, to }: { category: string; from?: string | null; to?: string | null }) {
  const { can } = useAuth()
  const canManage = can("finance.manage")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Offertory | null>(null)
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null)

  useEffect(() => setPage(1), [category, from, to])

  const { rows, meta, isLoading, error } = usePaginated<Offertory>(qs("/offertory", { category, from, to, page, perPage: 20 }))

  return (
    <>
      <TableCard title="Offering records" count={meta?.total} footer={meta && meta.total > 0 && <Pager meta={meta} onPage={setPage} />}>
        {error && <p className="px-6 pt-4 text-sm text-destructive">{error.message}</p>}
        {isLoading && !meta ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={HandCoins} title="No offerings recorded" description="Offerings you record will be listed here." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Given by</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden md:table-cell">Date · service</TableHead>
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
              {rows.map((o) => {
                const anonymous = !o.memberId && /^anonymous$/i.test(o.contributor)
                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {anonymous ? (
                          <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <EyeOff className="size-4" />
                          </span>
                        ) : (
                          <PersonAvatar name={o.contributor} />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold">{o.contributor}</p>
                          <p className="text-xs text-muted-foreground">
                            {o.memberId ? (o.pledgeNumber ? <span className="font-mono">{o.pledgeNumber}</span> : "Member") : anonymous ? "Anonymous gift" : "Visitor"}
                            <span className="md:hidden"> · {date(o.date)}</span>
                            <span className="hidden sm:inline"> · {o.reference}</span>
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={CATEGORY_COLORS[o.category]}>
                        {titleCase(o.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm">{date(o.date)}</p>
                      <p className="text-xs text-muted-foreground">{o.service ?? "—"}</p>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{o.paymentMethod}</TableCell>
                    <TableCell className="text-right font-semibold tabular">{money(o.amount)}</TableCell>
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
                            <DropdownMenuItem onClick={() => (setSelected(o), setDialog("edit"))}>
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => (setSelected(o), setDialog("delete"))}>
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
          <OffertoryFormDialog
            key={`edit-${selected.id}`}
            record={selected}
            open={dialog === "edit"}
            onOpenChange={(o) => !o && setDialog(null)}
          />
          <ConfirmDialog
            open={dialog === "delete"}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Delete Offering"
            description={
              <>
                Delete the {selected.category} of <span className="font-semibold">{money(selected.amount)}</span> from{" "}
                {selected.contributor} ({selected.reference})?
              </>
            }
            onConfirm={async () => {
              const ok = await runAction(() => del(`/offertory/${selected.id}`), "Offering deleted")
              if (ok) refreshOffertory()
              return ok
            }}
          />
        </>
      )}
    </>
  )
}
