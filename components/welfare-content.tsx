"use client"

import { useState, useEffect } from "react"
import { mutate } from "swr"
import { HandHeart, Plus, PiggyBank, Clock, CheckCircle2, MoreHorizontal, Pencil, Trash2, ThumbsUp, ThumbsDown, Banknote, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, PersonAvatar, StatCard, TableCard, TableSkeleton } from "@/components/page"
import { Pager } from "@/components/pager"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, num, runAction, str, useApiForm } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { del, patch, post, qs, useApi, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlParam } from "@/lib/use-url-param"
import { CURRENCY, humanize, longDate, money, today } from "@/lib/format"
import { PAYMENT_METHODS, WELFARE_CATEGORIES, type WelfareCase, type WelfareStats } from "@/lib/types"
import { usePeriod } from "@/lib/period"
import { PeriodFilter, periodParams } from "@/components/period-filter"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/welfare") || k.startsWith("/accounts") || k.startsWith("/budgets")))
const STATUS = {
  pending: { label: "Awaiting decision", variant: "warning" },
  approved: { label: "Approved · to pay", variant: "info" },
  paid: { label: "Paid", variant: "success" },
  declined: { label: "Declined", variant: "muted" },
} as const
const TABS = { open: "pending,approved", paid: "paid", declined: "declined", all: "" } as const

export function WelfareContent() {
  const { can } = useAuth()
  const canPay = can("finance.manage")
  const [tab, setTab] = useState<keyof typeof TABS>("open")
  const [page, setPage] = useState(1)
  const period = usePeriod("all")
  useEffect(() => setPage(1), [period.range.from, period.range.to])
  const [selected, setSelected] = useState<WelfareCase | null>(null)
  const [dialog, setDialog] = useState<"new" | "edit" | "approve" | "pay" | "delete" | null>(null)

  useUrlParam("tab", (t) => t in TABS && (setTab(t as keyof typeof TABS), setPage(1)))

  const { data: stats } = useApi<WelfareStats>("/welfare/stats")
  const { rows, meta, isLoading } = usePaginated<WelfareCase>(qs("/welfare", { status: TABS[tab], ...periodParams(period), page, perPage: 20 }))
  const act = (c: WelfareCase, d: typeof dialog) => (setSelected(c), setDialog(d))

  const decline = async (c: WelfareCase) => {
    if (await runAction(() => post(`/welfare/${c.id}/decision`, { decision: "decline" }), "Request declined")) refresh()
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Stewardship"
        title="Welfare fund"
        description="Care for members in need: bereavement, hospital bills, school fees, food. Payouts are posted to Accounts under “Welfare”."
        actions={<Button onClick={() => setDialog("new")}><Plus className="size-4" /> New request</Button>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Fund balance" icon={PiggyBank} tone={(stats?.fundBalance ?? 0) >= 0 ? "success" : "danger"} value={stats && money(stats.fundBalance)}
          hint="Welfare income minus payouts" valueClassName={(stats?.fundBalance ?? 0) < 0 ? "text-destructive" : undefined} />
        <StatCard label="Awaiting a decision" icon={Clock} tone="gold" value={stats?.pending.toLocaleString()} />
        <StatCard label="Approved, not yet paid" icon={Banknote} tone="info" value={stats?.awaitingPayment.toLocaleString()}
          hint={stats && stats.awaitingPaymentAmount ? money(stats.awaitingPaymentAmount) : undefined} />
        <StatCard label="Helped this year" icon={Users} value={stats?.helpedThisYear.toLocaleString()} hint={stats && `${money(stats.paidThisYear)} paid out`} />
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
      <Tabs value={tab} onValueChange={(v) => (setTab(v as typeof tab), setPage(1))}>
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="declined">Declined</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
      <PeriodFilter period={period} allowAll label="Requested" />
      </div>

      <TableCard title="Requests" count={meta?.total} footer={meta && meta.total > 0 && <Pager meta={meta} onPage={setPage} />}>
        {isLoading && !meta ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={HandHeart} title={tab === "open" ? "No open requests" : "Nothing here"} description="Record a request when a member or family needs help." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beneficiary</TableHead>
                <TableHead>Need</TableHead>
                <TableHead className="text-right">Requested</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-normal">
                    <div className="flex items-center gap-3">
                      <PersonAvatar name={c.beneficiary} />
                      <div className="min-w-0">
                        <p className="font-semibold">{c.beneficiary}</p>
                        <p className="max-w-72 truncate text-xs text-muted-foreground">
                          {c.pledgeNumber && <span className="font-mono">{c.pledgeNumber} · </span>}
                          {c.description ?? `Recorded ${longDate(c.createdAt)}`}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{humanize(c.category)}</Badge></TableCell>
                  <TableCell className="text-right tabular text-muted-foreground">{c.amountRequested ? money(c.amountRequested) : "—"}</TableCell>
                  <TableCell className="text-right font-semibold tabular">{c.amountApproved ? money(c.amountApproved) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge>
                    {c.decidedBy && <p className="mt-1 text-[11px] text-muted-foreground">by {c.decidedBy}{c.paidReference ? ` · ${c.paidReference}` : ""}</p>}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.status !== "paid" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {c.status !== "approved" && <DropdownMenuItem onClick={() => act(c, "approve")}><ThumbsUp className="size-4" /> Approve</DropdownMenuItem>}
                          {c.status === "approved" && canPay && <DropdownMenuItem onClick={() => act(c, "pay")}><Banknote className="size-4" /> Pay out</DropdownMenuItem>}
                          {c.status === "approved" && <DropdownMenuItem onClick={() => act(c, "approve")}><Pencil className="size-4" /> Change amount</DropdownMenuItem>}
                          {c.status !== "declined" && <DropdownMenuItem onClick={() => decline(c)}><ThumbsDown className="size-4" /> Decline</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => act(c, "edit")}><Pencil className="size-4" /> Edit details</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => act(c, "delete")}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>

      <CaseDialog key="new" open={dialog === "new"} onOpenChange={(o) => !o && setDialog(null)} />
      {selected && (
        <>
          <CaseDialog key={`e-${selected.id}`} record={selected} open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} />
          <ApproveDialog key={`a-${selected.id}`} c={selected} open={dialog === "approve"} onOpenChange={(o) => !o && setDialog(null)} />
          <PayDialog key={`p-${selected.id}`} c={selected} balance={stats?.fundBalance} open={dialog === "pay"} onOpenChange={(o) => !o && setDialog(null)} />
          <ConfirmDialog open={dialog === "delete"} onOpenChange={(o) => !o && setDialog(null)} title="Delete request"
            description={`Delete the ${humanize(selected.category).toLowerCase()} request for ${selected.beneficiary}?`}
            onConfirm={async () => { const ok = await runAction(() => del(`/welfare/${selected.id}`), "Request deleted"); if (ok) refresh(); return ok }} />
        </>
      )}
    </Page>
  )
}

function CaseDialog({ record, open, onOpenChange }: { record?: WelfareCase; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const memberId = str(fd, "memberId")
    const body = { memberId: memberId ? Number(memberId) : null, beneficiary: memberId ? null : str(fd, "beneficiary"),
      category: str(fd, "category"), description: str(fd, "description"), amountRequested: num(fd, "amountRequested") }
    if (record) await patch(`/welfare/${record.id}`, body)
    else await post("/welfare", body)
    refresh()
    onOpenChange(false)
  }, record ? "Request updated" : "Request recorded")

  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{record ? "Edit request" : "New welfare request"}</DialogTitle>
          <DialogDescription>Only people with welfare access can see these requests.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="w-who">Who needs help</Label>
            <MemberPicker id="w-who" name="memberId" freeTextName="beneficiary" placeholder="Member or a name / family"
              initial={record?.memberId ? { id: record.memberId, name: record.beneficiary } : null}
              initialText={record && !record.memberId ? record.beneficiary : undefined} />
            <FieldError error={error} name="beneficiary" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-cat">Need</Label>
            <Select name="category" defaultValue={record?.category ?? "bereavement"}>
              <SelectTrigger id="w-cat" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{WELFARE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{humanize(c)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-req">Amount requested ({CURRENCY})</Label>
            <Input id="w-req" name="amountRequested" type="number" min="1" step="0.01" defaultValue={record?.amountRequested ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="w-desc">Situation</Label>
            <Textarea id="w-desc" name="description" rows={3} defaultValue={record?.description ?? ""} placeholder="What happened and what the help is for" />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save request"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ApproveDialog({ c, open, onOpenChange }: { c: WelfareCase; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    await post(`/welfare/${c.id}/decision`, { decision: "approve", amount: num(fd, "amount") })
    refresh()
    onOpenChange(false)
  }, "Request approved")
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Approve help for {c.beneficiary}</DialogTitle>
          <DialogDescription>{c.amountRequested ? `They asked for ${money(c.amountRequested)}.` : "No amount was requested."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ap-amt">Amount to give ({CURRENCY})</Label>
            <Input id="ap-amt" name="amount" type="number" min="1" step="0.01" defaultValue={c.amountApproved ?? c.amountRequested ?? ""} required autoFocus />
            <FieldError error={error} name="amount" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}><ThumbsUp className="size-4" /> Approve</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PayDialog({ c, balance, open, onOpenChange }: { c: WelfareCase; balance?: number; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { handleSubmit, pending, reset } = useApiForm(async (fd) => {
    await post(`/welfare/${c.id}/pay`, { date: str(fd, "date"), paymentMethod: str(fd, "paymentMethod") })
    refresh()
    onOpenChange(false)
  }, "Paid and posted to Accounts")
  const short = balance !== undefined && c.amountApproved !== null && c.amountApproved > balance
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pay {money(c.amountApproved)}</DialogTitle>
          <DialogDescription>To {c.beneficiary}. This records a Welfare expense in Accounts.</DialogDescription>
        </DialogHeader>
        {short && <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm">The welfare fund only has {money(balance)}. Paying will take it below zero.</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="py-d">Date</Label><Input id="py-d" name="date" type="date" max={today()} defaultValue={today()} required /></div>
            <div className="space-y-2">
              <Label htmlFor="py-m">Method</Label>
              <Select name="paymentMethod" defaultValue="Cash">
                <SelectTrigger id="py-m" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}><CheckCircle2 className="size-4" /> Confirm payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
