"use client"

import { useEffect, useState } from "react"
import { mutate } from "swr"
import { Handshake, Plus, Search, Wallet, AlertTriangle, CheckCircle2, MoreHorizontal, Pencil, Trash2, HandCoins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { CURRENCY, longDate, money, relativeDay, today } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import { PAYMENT_METHODS, type Pledge, type PledgeStats, type PledgeStatus, type Project } from "@/lib/types"
import { usePeriod } from "@/lib/period"
import { PeriodFilter, periodParams } from "@/components/period-filter"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/pledges") || k.startsWith("/offertory") || k === "/dashboard"))
const STATUS: Record<PledgeStatus, { label: string; variant: "info" | "danger" | "success" }> = {
  open: { label: "Paying", variant: "info" },
  overdue: { label: "Overdue", variant: "danger" },
  fulfilled: { label: "Fulfilled", variant: "success" },
}

export function PledgesContent() {
  const { can } = useAuth()
  const canManage = can("finance.manage")
  const [status, setStatus] = useState("all")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const period = usePeriod("all")
  useEffect(() => setPage(1), [period.range.from, period.range.to])
  const [selected, setSelected] = useState<Pledge | null>(null)
  const [dialog, setDialog] = useState<"new" | "edit" | "pay" | "delete" | null>(null)

  useUrlParam("q", (q) => {
    setSearchInput(q)
    setStatus("all")
  })

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])
  useEffect(() => setPage(1), [status, search])

  const { data: stats } = useApi<PledgeStats>("/pledges/stats")
  const { rows, meta, isLoading } = usePaginated<Pledge>(qs("/pledges", { status, search, ...periodParams(period), page, perPage: 20 }))
  const act = (p: Pledge, d: typeof dialog) => (setSelected(p), setDialog(d))

  return (
    <Page>
      <PageHeader
        eyebrow="Stewardship"
        title="Pledges"
        description="What members have promised (building fund, harvest and more) and how much they've paid. Payments count as pledge offerings."
        actions={canManage && <Button onClick={() => setDialog("new")}><Plus className="size-4" /> New pledge</Button>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Promised" icon={Handshake} tone="gold" value={stats && money(stats.promised)} hint={stats && `${stats.pledges} pledges`} />
        <StatCard label="Paid so far" icon={Wallet} tone="success" value={stats && money(stats.paid)}
          hint={stats && stats.promised ? `${Math.round((stats.paid / stats.promised) * 100)}% of promises` : undefined} />
        <StatCard label="Still to come" icon={HandCoins} value={stats && money(stats.outstanding)} />
        <StatCard label="Overdue" icon={AlertTriangle} tone="danger" value={stats?.overdue.toLocaleString()} hint={stats && `${stats.fulfilled} fulfilled`} />
      </section>

      {stats && stats.byPurpose.length > 0 && (
        <Card>
          <CardHeader><CardTitle>By purpose</CardTitle></CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            {stats.byPurpose.map((p) => {
              const pct = p.promised ? Math.min(100, (p.paid / p.promised) * 100) : 0
              return (
                <div key={p.purpose} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold">{p.purpose}</span>
                    <span className="tabular text-muted-foreground"><span className="font-semibold text-foreground">{money(p.paid)}</span> of {money(p.promised)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${pct >= 100 ? "bg-gold" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{Math.round(pct)}% paid</p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <PeriodFilter period={period} allowAll label="Pledged" />

      <TableCard
        title="All pledges"
        count={meta?.total}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="relative sm:w-60">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Name, pledge no or purpose…" className="h-9 pl-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger size="sm" className="sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="open">Paying</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        footer={meta && meta.total > 0 && <Pager meta={meta} onPage={setPage} />}
      >
        {isLoading && !meta ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={Handshake} title="No pledges" description="Record promises made for the building fund, harvest or other causes." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pledger</TableHead>
                <TableHead className="hidden md:table-cell">Purpose</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="hidden lg:table-cell">Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const pct = Math.min(100, (p.paid / p.amount) * 100)
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <PersonAvatar name={p.pledger} />
                        <div>
                          <p className="font-semibold">{p.pledger}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.pledgeNumber && <span className="font-mono">{p.pledgeNumber} · </span>}
                            <span className="md:hidden">{p.purpose}</span>
                            <span className="hidden md:inline">pledged {longDate(p.pledgeDate)}</span>
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{p.purpose}</TableCell>
                    <TableCell className="min-w-44">
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="font-semibold tabular">{money(p.paid)}</span>
                        <span className="text-muted-foreground tabular">of {money(p.amount)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${p.status === "overdue" ? "bg-destructive" : p.status === "fulfilled" ? "bg-success" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm lg:table-cell">
                      {p.dueDate ? (<><p>{longDate(p.dueDate)}</p><p className="text-xs text-muted-foreground">{p.status !== "fulfilled" && relativeDay(p.dueDate)}</p></>) : "—"}
                    </TableCell>
                    <TableCell><Badge variant={STATUS[p.status].variant}>{STATUS[p.status].label}</Badge></TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {p.status !== "fulfilled" && (
                              <DropdownMenuItem onClick={() => act(p, "pay")}><HandCoins className="size-4" /> Record payment</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => act(p, "edit")}><Pencil className="size-4" /> Edit pledge</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => act(p, "delete")}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </TableCard>

      <PledgeDialog key="new" open={dialog === "new"} onOpenChange={(o) => !o && setDialog(null)} />
      {selected && (
        <>
          <PledgeDialog key={`e-${selected.id}`} record={selected} open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} />
          <PaymentDialog key={`p-${selected.id}`} pledge={selected} open={dialog === "pay"} onOpenChange={(o) => !o && setDialog(null)} />
          <ConfirmDialog
            open={dialog === "delete"}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Delete pledge"
            description={`Delete ${selected.pledger}'s pledge of ${money(selected.amount)}? Payments already made stay in the offertory as pledge offerings.`}
            onConfirm={async () => {
              const ok = await runAction(() => del(`/pledges/${selected.id}`), "Pledge deleted")
              if (ok) refresh()
              return ok
            }}
          />
        </>
      )}
    </Page>
  )
}

function PledgeDialog({ record, open, onOpenChange }: { record?: Pledge; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: projects = [] } = useApi<Project[]>(open ? "/projects?open=1" : null)
  const [projectId, setProjectId] = useState(record?.projectId ?? "none")
  const [purpose, setPurpose] = useState(record?.purpose ?? "")

  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const memberId = str(fd, "memberId")
    const body = {
      memberId: memberId ? Number(memberId) : null,
      pledgerName: memberId ? null : str(fd, "pledgerName"),
      projectId: projectId === "none" ? null : Number(projectId),
      purpose: purpose.trim(),
      amount: num(fd, "amount"),
      pledgeDate: str(fd, "pledgeDate"),
      dueDate: str(fd, "dueDate"),
      notes: str(fd, "notes"),
    }
    if (record) await patch(`/pledges/${record.id}`, body)
    else await post("/pledges", body)
    refresh()
    onOpenChange(false)
  }, record ? "Pledge updated" : "Pledge recorded")

  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{record ? "Edit pledge" : "New pledge"}</DialogTitle>
          <DialogDescription>Link it to a project so payments count toward it, or describe what it&apos;s for.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="p-who">Pledger</Label>
            <MemberPicker id="p-who" name="memberId" freeTextName="pledgerName" placeholder="Member, pledge no or a name…"
              initial={record?.memberId ? { id: record.memberId, name: record.pledger } : null}
              initialText={record && !record.memberId ? record.pledger : undefined} />
            <FieldError error={error} name="pledgerName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-camp">Project</Label>
            <Select value={projectId} onValueChange={(v) => { setProjectId(v); const p = projects.find((x) => x.id === v); if (p) setPurpose(p.name) }}>
              <SelectTrigger id="p-camp" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-purpose">Purpose</Label>
            <Input id="p-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Harvest 2026" required />
            <FieldError error={error} name="purpose" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-amt">Amount ({CURRENCY})</Label>
            <Input id="p-amt" name="amount" type="number" min="1" step="0.01" defaultValue={record?.amount} required />
            <FieldError error={error} name="amount" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-date">Pledged on</Label>
            <Input id="p-date" name="pledgeDate" type="date" defaultValue={record?.pledgeDate ?? today()} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-due">Due by (optional)</Label>
            <Input id="p-due" name="dueDate" type="date" defaultValue={record?.dueDate ?? ""} />
            <FieldError error={error} name="dueDate" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="p-notes">Notes</Label>
            <Textarea id="p-notes" name="notes" rows={2} defaultValue={record?.notes ?? ""} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save pledge"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PaymentDialog({ pledge, open, onOpenChange }: { pledge: Pledge; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { services } = useSettings()
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    await post(`/pledges/${pledge.id}/payments`, {
      amount: num(fd, "amount"), date: str(fd, "date"), paymentMethod: str(fd, "paymentMethod"),
      service: str(fd, "service") === "none" ? null : str(fd, "service"),
    })
    refresh()
    onOpenChange(false)
  }, "Payment recorded")

  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment from {pledge.pledger}</DialogTitle>
          <DialogDescription>
            {pledge.purpose}: {money(pledge.paid)} of {money(pledge.amount)} paid, <span className="font-semibold text-foreground">{money(pledge.balance)}</span> to go.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pp-amt">Amount ({CURRENCY})</Label>
            <Input id="pp-amt" name="amount" type="number" min="0.01" step="0.01" defaultValue={pledge.balance} required />
            <FieldError error={error} name="amount" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pp-date">Date</Label>
            <Input id="pp-date" name="date" type="date" max={today()} defaultValue={today()} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pp-m">Method</Label>
            <Select name="paymentMethod" defaultValue="Cash">
              <SelectTrigger id="pp-m" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pp-s">Service</Label>
            <Select name="service" defaultValue="none">
              <SelectTrigger id="pp-s" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not at a service</SelectItem>
                {services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}><CheckCircle2 className="size-4" /> {pending ? "Saving…" : "Record payment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
