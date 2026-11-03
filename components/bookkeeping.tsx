"use client"

/** Bookkeeping: journal entries, the chart of accounts with its posting rules, and the ledger for any account. */

import { useEffect, useState } from "react"
import { mutate } from "swr"
import { Download, Plus, Trash2, Pencil, MoreHorizontal, BookOpenCheck, Scale, Lock, ArrowRightLeft, Landmark, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, TableSkeleton } from "@/components/page"
import { Pager } from "@/components/pager"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, runAction, str, useApiForm } from "@/components/form"
import { acct, downloadCsv } from "@/components/financial-statements"
import { del, patch, post, put, qs, useApi, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { usePeriod } from "@/lib/period"
import { PeriodFilter, periodParams } from "@/components/period-filter"
import { date, humanize, today } from "@/lib/format"
import { ACCOUNT_SUBTYPES, ACCOUNT_TYPES, JOURNAL_KINDS, type Account, type AccountMappings, type AccountType, type FundOption, type GeneralLedger, type Journal, type MappingSource } from "@/lib/types"
import { cn } from "@/lib/utils"

const refresh = () => mutate((k) => typeof k === "string" && k.startsWith("/accounting"))
const TYPE_LABEL: Record<AccountType, string> = { asset: "Assets", liability: "Liabilities", fund: "Funds", income: "Income", expense: "Expenses" }
const SOURCE_LABEL: Record<MappingSource, { title: string; hint: string }> = {
  payment_method: { title: "Payment methods", hint: "Where money received or paid this way sits" },
  offertory: { title: "Offertory book", hint: "Income account for each offertory category" },
  income: { title: "Accounts — income", hint: "Income account for each income category" },
  expense: { title: "Accounts — spending", hint: "Expense account — or an asset account for capital items like land" },
}

// ---------------------------------------------------------------- general ledger

export function LedgerDialog({ id, from, to, open, onOpenChange }: { id: string; from?: string; to?: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const period = usePeriod("this_year", from && to ? { from, to } : undefined)
  const range = { from: period.range.from ?? undefined, to: period.range.to ?? today() }
  const { data } = useApi<GeneralLedger>(qs(`/accounting/ledger/${id}`, range))
  const SRC = { offertory: "Offertory", transaction: "Accounts", journal: "Journal" } as const
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BookOpenCheck className="size-5 text-primary" />{data ? <><span className="font-mono text-base text-muted-foreground">{data.account.code}</span> {data.account.name}</> : "General ledger"}</DialogTitle>
          <DialogDescription>Every entry that makes up this account&apos;s balance.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-end gap-3">
          <PeriodFilter period={period} />
          {data && <Button variant="outline" className="ml-auto" onClick={() => downloadCsv(`ledger-${data.account.code}-${data.from}-to-${data.to}.csv`, [
            ["Date", "Reference", "Source", "Description", "Fund", "Debit", "Credit", "Balance"],
            ["", "", "", "Opening balance", "", "", "", data.opening],
            ...data.rows.map((r) => [r.date, r.reference, SRC[r.source], r.description, r.fund, r.debit || "", r.credit || "", r.balance]),
          ])}><Download className="size-4" /> CSV</Button>}
        </div>
        {!data ? <TableSkeleton /> : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Details</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow className="bg-muted/40"><TableCell colSpan={5} className="font-medium">Opening balance</TableCell><TableCell className="text-right font-semibold tabular">{acct(data.opening)}</TableCell></TableRow>
                {data.rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No entries in this period.</TableCell></TableRow>}
                {data.rows.map((r, i) => (
                  <TableRow key={`${r.source}-${r.sourceId}-${i}`}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{date(r.date)}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{r.reference}<div className="font-sans text-[11px] text-muted-foreground">{SRC[r.source]}</div></TableCell>
                    <TableCell className="min-w-56 whitespace-normal"><div>{r.description}</div>{r.fund !== "General" && <Badge variant="outline" className="mt-0.5">{r.fund}</Badge>}</TableCell>
                    <TableCell className="text-right tabular">{r.debit ? acct(r.debit) : ""}</TableCell>
                    <TableCell className="text-right tabular">{r.credit ? acct(r.credit) : ""}</TableCell>
                    <TableCell className={cn("text-right font-medium tabular", r.balance < 0 && "text-destructive")}>{acct(r.balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell colSpan={3}>Closing balance</TableCell>
                  <TableCell className="text-right tabular">{acct(data.totals.debit)}</TableCell>
                  <TableCell className="text-right tabular">{acct(data.totals.credit)}</TableCell>
                  <TableCell className="text-right tabular">{acct(data.closing)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
        {data?.truncated && <p className="text-xs text-muted-foreground">Showing the first 3,000 entries. Narrow the dates to see the rest.</p>}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------- journals

export function JournalEntries() {
  const { can } = useAuth()
  const canManage = can("finance.manage")
  const [kind, setKind] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Journal | { preset: Preset } | null>(null)
  const [removing, setRemoving] = useState<Journal | null>(null)
  const period = usePeriod("all")
  useEffect(() => setPage(1), [period.range.from, period.range.to])
  const { rows, meta, isLoading } = usePaginated<Journal>(qs("/accounting/journals", { kind: kind === "all" ? null : kind, search: search || null, ...periodParams(period), page, perPage: 15 }))

  return (
    <div className="space-y-4">
      <Card className="gap-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Journal entries</h3>
            <p className="max-w-2xl text-sm text-muted-foreground">Offertory and Accounts transactions post themselves. Use a journal entry for everything else, like opening balances, banking cash, buying assets, loans and depreciation.</p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditing({ preset: "opening" })}><Scale className="size-4" /> Opening balances</Button>
              <Button variant="outline" onClick={() => setEditing({ preset: "transfer" })}><ArrowRightLeft className="size-4" /> Bank / transfer cash</Button>
              <Button onClick={() => setEditing({ preset: "general" })}><Plus className="size-4" /> New journal entry</Button>
            </div>
          )}
        </div>
      </Card>
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-end gap-2 border-b p-4">
          <PeriodFilter period={period} allowAll />
          <div className="relative min-w-52 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => (setSearch(e.target.value), setPage(1))} placeholder="Memo or JV number…" className="pl-9" />
          </div>
          <Select value={kind} onValueChange={(v) => (setKind(v), setPage(1))}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All kinds</SelectItem>{JOURNAL_KINDS.map((k) => <SelectItem key={k} value={k}>{humanize(k)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {isLoading ? <TableSkeleton /> : rows.length === 0 ? <EmptyState icon={Landmark} title="No journal entries yet" description="Start with your opening balances: cash, bank, land and buildings, and any loans." /> : (
          <ul className="divide-y">
            {rows.map((j) => (
              <li key={j.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{j.memo}</span><Badge variant="outline">{humanize(j.kind)}</Badge></div>
                    <div className="text-xs text-muted-foreground">{date(j.date)} · <span className="font-mono">{j.reference}</span>{j.recordedBy ? ` · ${j.recordedBy}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular">{acct(j.total)}</span>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing(j)}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setRemoving(j)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <table className="mt-2 w-full text-sm">
                  <tbody>
                    {j.lines.map((l, i) => (
                      <tr key={i} className="text-muted-foreground">
                        <td className={cn("py-0.5", l.credit > 0 && "pl-8")}>{l.account}{l.fund !== "general" && <span className="ml-1.5 text-xs">({l.project ?? humanize(l.fund)} fund)</span>}{l.memo && <span className="text-xs"> · {l.memo}</span>}</td>
                        <td className="w-32 text-right tabular">{l.debit ? acct(l.debit) : ""}</td>
                        <td className="w-32 text-right tabular">{l.credit ? acct(l.credit) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </li>
            ))}
          </ul>
        )}
        <Pager meta={meta} onPage={setPage} />
      </Card>
      {editing && <JournalDialog record={"id" in editing ? editing : undefined} preset={"preset" in editing ? editing.preset : undefined} open onOpenChange={(o) => !o && setEditing(null)} />}
      {removing && (
        <ConfirmDialog open onOpenChange={(o) => !o && setRemoving(null)} title={`Delete ${removing.reference}?`} description={`“${removing.memo}” is removed and every statement recalculates.`}
          onConfirm={async () => { const ok = await runAction(() => del(`/accounting/journals/${removing.id}`), "Journal deleted"); if (ok) refresh(); return ok }} />
      )}
    </div>
  )
}

type Preset = "general" | "opening" | "transfer"
type Line = { accountId: string; fund: string; debit: string; credit: string; memo: string }
const blank = (): Line => ({ accountId: "", fund: "general", debit: "", credit: "", memo: "" })

function AccountSelect({ accounts, value, onChange, id, filter }: { accounts: Account[]; value: string; onChange: (v: string) => void; id?: string; filter?: (a: Account) => boolean }) {
  const list = accounts.filter((a) => a.active && (!filter || filter(a)))
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full"><SelectValue placeholder="Account" /></SelectTrigger>
      <SelectContent>
        {ACCOUNT_TYPES.map((t) => {
          const g = list.filter((a) => a.type === t)
          return g.length ? <SelectGroup key={t}><SelectLabel>{TYPE_LABEL[t]}</SelectLabel>{g.map((a) => <SelectItem key={a.id} value={a.id}><span className="font-mono text-xs text-muted-foreground">{a.code}</span> {a.name}</SelectItem>)}</SelectGroup> : null
        })}
      </SelectContent>
    </Select>
  )
}

function JournalDialog({ record, preset, open, onOpenChange }: { record?: Journal; preset?: Preset; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: accounts = [] } = useApi<Account[]>("/accounting/accounts")
  const { data: funds = [] } = useApi<FundOption[]>("/accounting/funds")
  const byCode = (c: string) => accounts.find((a) => a.code === c)?.id ?? ""
  const [kind, setKind] = useState<string>(record?.kind ?? (preset === "opening" ? "opening" : preset === "transfer" ? "transfer" : "general"))
  const [lines, setLines] = useState<Line[] | null>(record ? record.lines.map((l) => ({
    accountId: l.accountId, fund: l.fund === "project" ? `p:${l.projectId}` : l.fund, debit: l.debit ? String(l.debit) : "", credit: l.credit ? String(l.credit) : "", memo: l.memo ?? "",
  })) : null)
  // presets fill in once the chart of accounts has loaded (not before, or typing would lock in blank lines)
  useEffect(() => {
    if (lines || !accounts.length) return
    setLines(preset === "opening" ? ["1000", "1010", "1020", "1500", "1510"].map((c) => ({ ...blank(), accountId: byCode(c) })).concat([{ ...blank(), accountId: byCode("3000") }])
      : preset === "transfer" ? [{ ...blank(), accountId: byCode("1020") }, { ...blank(), accountId: byCode("1000") }]
        : [blank(), blank()])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts.length])
  const rows: Line[] = lines ?? []
  const set = (i: number, patchLine: Partial<Line>) => setLines(rows.map((l, k) => (k === i ? { ...l, ...patchLine } : l)))
  const dr = rows.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const cr = rows.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const diff = Math.round((dr - cr) * 100) / 100
  const usable = rows.filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))

  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const body = {
      date: str(fd, "date"), memo: str(fd, "memo"), kind,
      lines: usable.map((l) => ({
        accountId: Number(l.accountId), debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, memo: l.memo || null,
        fund: l.fund.startsWith("p:") ? "project" : l.fund, projectId: l.fund.startsWith("p:") ? Number(l.fund.slice(2)) : null,
      })),
    }
    if (record) await patch(`/accounting/journals/${record.id}`, body)
    else await post("/accounting/journals", body)
    refresh()
    onOpenChange(false)
  }, record ? "Journal updated" : "Journal posted")

  const title = record ? `Edit ${record.reference}` : preset === "opening" ? "Opening balances" : preset === "transfer" ? "Bank or transfer cash" : "New journal entry"
  const help = preset === "opening" && !record
    ? "Enter what the church owned and owed on the day you start: cash, mobile money, bank, land and buildings, equipment (debits), and loans (credits). Put the difference in General fund, or in a project's fund if that money was given for it."
    : preset === "transfer" && !record
      ? "Money moved between your own accounts, e.g. Sunday cash banked (debit Bank, credit Cash) or petty cash drawn (debit Cash, credit Bank)."
      : "Debits must equal credits. Assets and expenses grow with debits; income, funds and liabilities with credits."

  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{help}</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2"><Label htmlFor="jv-d">Date</Label><Input id="jv-d" name="date" type="date" max={today()} defaultValue={record?.date ?? today()} required /><FieldError error={error} name="date" /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="jv-m">Description</Label><Input id="jv-m" name="memo" required defaultValue={record?.memo ?? (preset === "opening" ? "Opening balances brought forward" : preset === "transfer" ? "Sunday cash banked" : "")} /><FieldError error={error} name="memo" /></div>
            <div className="space-y-2">
              <Label htmlFor="jv-k">Kind</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger id="jv-k" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{JOURNAL_KINDS.map((k) => <SelectItem key={k} value={k}>{humanize(k)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {!lines ? <div className="h-40 animate-pulse rounded-xl bg-muted" /> : <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground"><tr>
                <th className="px-3 py-2 text-left font-medium">Account</th><th className="px-3 py-2 text-left font-medium">Fund</th>
                <th className="w-32 px-3 py-2 text-right font-medium">Debit</th><th className="w-32 px-3 py-2 text-right font-medium">Credit</th>
                <th className="px-3 py-2 text-left font-medium">Note</th><th className="w-10" />
              </tr></thead>
              <tbody>
                {rows.map((l, i) => (
                  <tr key={i} className="border-t">
                    <td className="w-64 px-2 py-1.5"><AccountSelect accounts={accounts} value={l.accountId} onChange={(v) => set(i, { accountId: v })} /></td>
                    <td className="w-48 px-2 py-1.5">
                      <Select value={l.fund} onValueChange={(v) => set(i, { fund: v })}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>{funds.map((f) => { const k = f.key === "project" ? `p:${f.projectId}` : f.key; return <SelectItem key={k} value={k}>{f.name}</SelectItem> })}</SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5"><Input type="number" min="0" step="0.01" className="text-right" value={l.debit} onChange={(e) => set(i, { debit: e.target.value, credit: e.target.value ? "" : l.credit })} /></td>
                    <td className="px-2 py-1.5"><Input type="number" min="0" step="0.01" className="text-right" value={l.credit} onChange={(e) => set(i, { credit: e.target.value, debit: e.target.value ? "" : l.debit })} /></td>
                    <td className="px-2 py-1.5"><Input value={l.memo} onChange={(e) => set(i, { memo: e.target.value })} /></td>
                    <td className="px-1"><Button type="button" variant="ghost" size="icon" className="size-8" disabled={rows.length <= 2} onClick={() => setLines(rows.filter((_, k) => k !== i))} aria-label="Remove line"><Trash2 className="size-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30 font-semibold">
                <tr>
                  <td className="px-3 py-2" colSpan={2}><Button type="button" size="sm" variant="ghost" onClick={() => setLines([...rows, blank()])}><Plus className="size-4" /> Add line</Button></td>
                  <td className="px-3 py-2 text-right tabular">{acct(dr)}</td>
                  <td className="px-3 py-2 text-right tabular">{acct(cr)}</td>
                  <td className={cn("px-3 py-2 text-sm", diff === 0 && dr > 0 ? "text-success" : "text-destructive")} colSpan={2}>
                    {dr === 0 ? "" : diff === 0 ? "Balanced ✓" : `Out by ${acct(Math.abs(diff))}`}
                    {preset === "opening" && diff !== 0 && !record && (
                      <Button type="button" size="sm" variant="link" className="h-auto p-0 pl-2" onClick={() => {
                        const gi = rows.findIndex((r) => r.accountId === byCode("3000"))
                        const v = Math.round((Number(rows[gi]?.credit) || 0) + diff * 100) / 100
                        if (gi >= 0) set(gi, v >= 0 ? { credit: String(v), debit: "" } : { debit: String(-v), credit: "" })
                      }}>Balance to General fund</Button>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>}
          <FieldError error={error} name="lines" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || diff !== 0 || usable.length < 2}>{pending ? "Posting…" : record ? "Save entry" : "Post entry"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------- chart of accounts

export function ChartOfAccounts({ onAccount }: { onAccount: (id: string) => void }) {
  const { can } = useAuth()
  const canManage = can("finance.manage")
  const { data: accounts = [], isLoading } = useApi<Account[]>("/accounting/accounts")
  const [editing, setEditing] = useState<Account | "new" | null>(null)
  const [removing, setRemoving] = useState<Account | null>(null)
  return (
    <div className="grid gap-5 xl:grid-cols-5">
      <Card className="gap-0 overflow-hidden py-0 xl:col-span-3">
        <div className="flex items-center justify-between border-b p-4">
          <div><h3 className="font-semibold">Chart of accounts</h3><p className="text-xs text-muted-foreground">Click an account to open its ledger.</p></div>
          {canManage && <Button size="sm" onClick={() => setEditing("new")}><Plus className="size-4" /> New account</Button>}
        </div>
        {isLoading ? <TableSkeleton /> : (
          <Table>
            <TableBody>
              {ACCOUNT_TYPES.map((t) => (
                <AccountGroup key={t} title={TYPE_LABEL[t]}>
                  {accounts.filter((a) => a.type === t).map((a) => (
                    <TableRow key={a.id} className={cn("cursor-pointer", !a.active && "opacity-50")} onClick={() => onAccount(a.id)}>
                      <TableCell className="w-20 font-mono text-xs text-muted-foreground">{a.code}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5 font-medium">{a.name}{a.isSystem && <Lock className="size-3 text-muted-foreground" aria-label="Needed by the ledger" />}{!a.active && <Badge variant="muted">inactive</Badge>}</div>
                        {(a.mappedFrom?.length ?? 0) > 0 && <div className="mt-0.5 text-xs text-muted-foreground">from {a.mappedFrom!.map((m) => m.key).join(", ")}</div>}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">{a.subtype ? humanize(a.subtype) : ""}</TableCell>
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditing(a)}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                              {!a.isSystem && <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => setRemoving(a)}><Trash2 className="size-4" /> Delete</DropdownMenuItem></>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </AccountGroup>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <div className="xl:col-span-2"><MappingsCard accounts={accounts} canManage={canManage} /></div>
      {editing && <AccountDialog record={editing === "new" ? undefined : editing} open onOpenChange={(o) => !o && setEditing(null)} />}
      {removing && (
        <ConfirmDialog open onOpenChange={(o) => !o && setRemoving(null)} title={`Delete ${removing.code} ${removing.name}?`} description="Only accounts with no entries and no links can be deleted. Otherwise, mark it inactive."
          onConfirm={async () => { const ok = await runAction(() => del(`/accounting/accounts/${removing.id}`), "Account deleted"); if (ok) refresh(); return ok }} />
      )}
    </div>
  )
}

function AccountGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead colSpan={4} className="h-8 text-xs uppercase tracking-wider">{title}</TableHead></TableRow>{children}</>
}

function AccountDialog({ record, open, onOpenChange }: { record?: Account; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [type, setType] = useState<AccountType>(record?.type ?? "expense")
  const [subtype, setSubtype] = useState<string>(record?.subtype ?? "none")
  const [active, setActive] = useState(record?.active ?? true)
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const body = { code: str(fd, "code"), name: str(fd, "name"), type, subtype: subtype === "none" ? null : subtype, description: str(fd, "description"), active }
    if (record) await patch(`/accounting/accounts/${record.id}`, body)
    else await post("/accounting/accounts", body)
    refresh()
    onOpenChange(false)
  }, record ? "Account updated" : "Account added")
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{record ? `Edit ${record.code}` : "New account"}</DialogTitle><DialogDescription>Codes: 1xxx assets, 2xxx liabilities, 3xxx funds, 4xxx income, 5xxx expenses.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2"><Label htmlFor="ac-c">Code</Label><Input id="ac-c" name="code" defaultValue={record?.code} required /><FieldError error={error} name="code" /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="ac-n">Name</Label><Input id="ac-n" name="name" defaultValue={record?.name} required /><FieldError error={error} name="name" /></div>
          <div className="space-y-2">
            <Label htmlFor="ac-t">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)} disabled={record?.isSystem}>
              <SelectTrigger id="ac-t" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ac-s">Kind</Label>
            <Select value={subtype} onValueChange={setSubtype}>
              <SelectTrigger id="ac-s" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">—</SelectItem>{ACCOUNT_SUBTYPES.map((s) => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-3"><Label htmlFor="ac-d">Description</Label><Input id="ac-d" name="description" defaultValue={record?.description ?? ""} /></div>
          <div className="flex items-center gap-2 sm:col-span-3"><Switch id="ac-a" checked={active} onCheckedChange={setActive} /><Label htmlFor="ac-a">Active</Label></div>
          <DialogFooter className="sm:col-span-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MappingsCard({ accounts, canManage }: { accounts: Account[]; canManage: boolean }) {
  const { data } = useApi<AccountMappings>("/accounting/mappings")
  const [changes, setChanges] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)
  const allowed: Record<MappingSource, (a: Account) => boolean> = {
    payment_method: (a) => a.type === "asset",
    offertory: (a) => a.type === "income",
    income: (a) => a.type === "income",
    expense: (a) => a.type === "expense" || a.type === "asset",
  }
  const rowsFor = (src: MappingSource) => [
    ...(data?.mappings.filter((m) => m.source === src).map((m) => ({ key: m.key, accountId: m.accountId, missing: false })) ?? []),
    ...((data?.unmapped[src] ?? []).map((k) => ({ key: k, accountId: "", missing: true }))),
  ]
  const save = async () => {
    setPending(true)
    const mappings = Object.entries(changes).map(([k, accountId]) => { const [source, key] = k.split("|"); return { source, key, accountId: Number(accountId) } })
    const ok = await runAction(() => put("/accounting/mappings", { mappings }), "Posting rules saved — statements updated")
    setPending(false)
    if (ok) { setChanges({}); refresh() }
  }
  return (
    <Card className="gap-0 p-5">
      <h3 className="font-semibold">How records post</h3>
      <p className="text-xs text-muted-foreground">Which account each offertory category, Accounts category and payment method lands in. Changes apply to all history.</p>
      {!data ? <div className="mt-4 h-64 animate-pulse rounded-xl bg-muted" /> : (
        <div className="mt-4 space-y-5">
          {(Object.keys(SOURCE_LABEL) as MappingSource[]).map((src) => (
            <section key={src}>
              <h4 className="text-sm font-semibold">{SOURCE_LABEL[src].title}</h4>
              <p className="mb-2 text-xs text-muted-foreground">{SOURCE_LABEL[src].hint}</p>
              <div className="space-y-1.5">
                {rowsFor(src).map((r) => {
                  const k = `${src}|${r.key}`
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <span className={cn("w-36 shrink-0 truncate text-sm", r.missing && "text-warning")} title={r.key}>{src === "offertory" ? humanize(r.key) : r.key}{r.missing && " •"}</span>
                      {canManage
                        ? <div className="min-w-0 flex-1"><AccountSelect accounts={accounts} value={changes[k] ?? r.accountId} onChange={(v) => setChanges((c) => ({ ...c, [k]: v }))} filter={allowed[src]} /></div>
                        : <span className="text-sm text-muted-foreground">{data.mappings.find((m) => m.source === src && m.key === r.key)?.account ?? "Fallback account"}</span>}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
          {canManage && <Button className="w-full" disabled={pending || Object.keys(changes).length === 0} onClick={save}>{pending ? "Saving…" : `Save ${Object.keys(changes).length || ""} change${Object.keys(changes).length === 1 ? "" : "s"}`}</Button>}
        </div>
      )}
    </Card>
  )
}
