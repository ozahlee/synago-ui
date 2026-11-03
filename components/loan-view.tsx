"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft, Banknote, CheckCircle2, Pencil, Printer, Receipt, RefreshCcw, ShieldCheck, Trash2, Undo2, AlertTriangle, Sparkles, CalendarClock, Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState, Page, StatCard } from "@/components/page"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { runAction } from "@/components/form"
import { LOAN_STATUS, LoanDialog, METHOD_LABEL, refreshLoans } from "@/components/loans-content"
import { downloadCsv } from "@/components/financial-statements"
import { ApiError, api, del, post, qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { CURRENCY, date, longDate, money, today } from "@/lib/format"
import type { Account, LoanDetail, LoanProjection } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Attachments } from "@/components/attachments"

const STATUS_ROW = { paid: "success", partial: "info", due: "outline", overdue: "danger" } as const

export function LoanView() {
  const id = useSearchParams().get("id")
  const router = useRouter()
  const { can } = useAuth()
  const manage = can("finance.manage")
  const { data: l, error } = useApi<LoanDetail>(id ? `/loans/${id}` : null)
  const [dialog, setDialog] = useState<null | "edit" | "approve" | "receive" | "pay" | "restructure" | "delete">(null)
  const [reversing, setReversing] = useState<{ kind: "payments" | "disbursements"; id: string; label: string } | null>(null)

  if (error) return <Page><EmptyState icon={Banknote} title="Couldn't load this loan" description={error.message} /></Page>
  if (!l) return <Page><div className="h-10 w-72 animate-pulse rounded-xl bg-muted" /><div className="h-56 animate-pulse rounded-2xl bg-muted" /></Page>

  const s = l.summary
  const base = Math.max(s.disbursed, l.principal)
  const unit = l.frequency === "monthly" ? "month" : "quarter"

  return (
    <Page>
      <div className="space-y-3">
        <Link href="/loans" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> Loans</Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">{l.lender}</h1>
              <Badge variant={LOAN_STATUS[l.status].variant}>{LOAN_STATUS[l.status].label}</Badge>
            </div>
            <p className="mt-1 text-muted-foreground">{l.purpose} · for <Link href={`/projects/view?id=${l.projectId}`} className="font-medium text-foreground hover:underline">{l.project}</Link>{l.accountNumber && <> · <span className="font-mono text-sm">{l.accountNumber}</span></>}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{money(l.principal)} · {METHOD_LABEL[l.interestMethod]}{l.interestMethod !== "none" && ` ${l.annualRate}% a year`} · {l.termPeriods} {unit}s{l.gracePeriods ? ` (+${l.gracePeriods} interest-only)` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link href={`/loans/print?id=${l.id}`} target="_blank"><Printer className="size-4" /> Statement</Link></Button>
            {manage && l.status === "proposed" && <Button onClick={() => setDialog("approve")}><ShieldCheck className="size-4" /> Record approval</Button>}
            {manage && ["approved", "active"].includes(l.status) && s.undrawn > 0 && <Button variant={l.status === "approved" ? "default" : "outline"} onClick={() => setDialog("receive")}><Banknote className="size-4" /> Money received</Button>}
            {manage && l.status === "active" && <Button onClick={() => setDialog("pay")}><Receipt className="size-4" /> Record repayment</Button>}
            {manage && l.status !== "closed" && <Button variant="outline" onClick={() => setDialog("edit")}><Pencil className="size-4" /> Edit</Button>}
            {manage && l.status === "active" && <Button variant="outline" onClick={() => setDialog("restructure")}><RefreshCcw className="size-4" /> Restructure</Button>}
            {manage && s.disbursed === 0 && <Button variant="ghost" size="icon" onClick={() => setDialog("delete")} aria-label="Delete loan"><Trash2 className="size-4" /></Button>}
          </div>
        </div>
      </div>

      {s.arrears.count > 0 && (
        <p className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" /> {s.arrears.count} instalment{s.arrears.count === 1 ? "" : "s"} overdue since {longDate(s.arrears.since)}: {money(s.arrears.amount)} in arrears. Banks usually add penalty interest, so pay or speak to the bank soon.
        </p>
      )}

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="gap-0 p-6 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Still owed</p>
              <p className="text-4xl font-semibold tabular">{money(s.outstanding + s.undrawn)}</p>
              <p className="text-sm text-muted-foreground">of {money(base)} borrowed{s.undrawn > 0 && s.disbursed > 0 ? ` (${money(s.undrawn)} not yet received)` : ""}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-semibold tabular text-success">{Math.round(s.progress)}%</p>
              <p className="text-sm text-muted-foreground">repaid</p>
            </div>
          </div>
          {/* countdown: the bar shrinks as the loan is repaid */}
          <div className="mt-5 h-5 overflow-hidden rounded-full bg-success/20">
            <div className="ml-auto h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, 100 - s.progress)}%` }} />
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
            <Fig label="Principal repaid" value={money(s.principalPaid)} />
            <Fig label="Interest paid" value={money(s.interestPaid + s.feesPaid)} />
            <Fig label="Interest still to pay" value={money(Math.max(0, s.totalInterest - s.interestPaid))} />
            <Fig label="Last instalment" value={date(s.endDate)} />
          </div>
        </Card>
        <Card className="gap-0 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next instalment</p>
          {s.nextInstallment && l.status === "active" ? (
            <>
              <p className="mt-1 text-3xl font-semibold tabular">{money(s.nextInstallment.amount)}</p>
              <p className={cn("text-sm", s.nextInstallment.daysLeft < 0 ? "text-destructive" : s.nextInstallment.daysLeft <= 7 ? "text-warning" : "text-muted-foreground")}>
                {s.nextInstallment.daysLeft < 0 ? `${-s.nextInstallment.daysLeft} days overdue` : s.nextInstallment.daysLeft === 0 ? "Due today" : `Due in ${s.nextInstallment.daysLeft} days`} · {longDate(s.nextInstallment.dueDate)}
              </p>
              {manage && <Button className="mt-4 w-full" onClick={() => setDialog("pay")}><Receipt className="size-4" /> Record this repayment</Button>}
            </>
          ) : l.status === "closed" ? (
            <p className="mt-2 flex items-center gap-2 text-success"><CheckCircle2 className="size-5" /> Fully repaid. Praise God!</p>
          ) : <p className="mt-2 text-sm text-muted-foreground">{l.status === "proposed" ? "Record the council's approval first, then the money when the bank releases it." : "Repayments start after the money is received."}</p>}
          <dl className="mt-5 space-y-1.5 border-t pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Approval</dt><dd className="text-right">{l.approvalRef ?? "—"}</dd></div>
            {l.consentRef && <div className="flex justify-between"><dt className="text-muted-foreground">Consent</dt><dd className="text-right">{l.consentRef}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted-foreground">Paid from</dt><dd className="text-right">{l.account ?? "Bank – current account"}</dd></div>
          </dl>
        </Card>
      </section>

      {l.status === "active" && <DebtFree loanId={l.id} />}

      <Tabs defaultValue="schedule" className="gap-4">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="payments">Repayments ({l.payments.length})</TabsTrigger>
          <TabsTrigger value="received">Money received ({l.disbursements.length})</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <Card className="gap-0 overflow-hidden py-0">
            <div className="flex items-center justify-between border-b p-4">
              <p className="text-sm text-muted-foreground">Repayments are matched to instalments in order, oldest first.</p>
              <Button variant="outline" size="sm" onClick={() => downloadCsv(`loan-schedule-${l.lender}.csv`, [["No.", "Due", "Principal", "Interest", "Instalment", "Paid", "Status"], ...s.installments.map((i) => [i.number, i.dueDate, i.principal, i.interest, i.amount, i.paid, i.status])])}><Download className="size-4" /> CSV</Button>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead className="w-12">No.</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Principal</TableHead><TableHead className="text-right">Interest</TableHead><TableHead className="text-right">Instalment</TableHead><TableHead className="text-right">Paid</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {s.installments.map((i) => (
                  <TableRow key={i.number} className={cn(i.status === "overdue" && "bg-destructive/5")}>
                    <TableCell className="tabular text-muted-foreground">{i.number}</TableCell>
                    <TableCell className="whitespace-nowrap">{date(i.dueDate)}</TableCell>
                    <TableCell className="text-right tabular">{money(i.principal)}</TableCell>
                    <TableCell className="text-right tabular text-muted-foreground">{money(i.interest)}</TableCell>
                    <TableCell className="text-right font-semibold tabular">{money(i.amount)}</TableCell>
                    <TableCell className="text-right tabular">{i.paid ? money(i.paid) : "—"}</TableCell>
                    <TableCell><Badge variant={STATUS_ROW[i.status]}>{i.status === "due" ? "To pay" : i.status[0].toUpperCase() + i.status.slice(1)}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="gap-0 overflow-hidden py-0">
            {l.payments.length === 0 ? <EmptyState icon={Receipt} title="No repayments yet" description="Each repayment is posted to the books: principal reduces the loan, interest is an expense of the project." /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Principal</TableHead><TableHead className="text-right">Interest & fees</TableHead><TableHead className="hidden md:table-cell">From</TableHead><TableHead className="hidden md:table-cell">Reference</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                <TableBody>
                  {l.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap">{date(p.date)}</TableCell>
                      <TableCell className="text-right font-semibold tabular">{money(p.amount)}</TableCell>
                      <TableCell className="text-right tabular">{money(p.principal)}</TableCell>
                      <TableCell className="text-right tabular text-muted-foreground">{money(p.interest + p.fees)}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{p.account}</TableCell>
                      <TableCell className="hidden font-mono text-xs md:table-cell">{p.reference ?? "—"}</TableCell>
                      <TableCell>{manage && <Button variant="ghost" size="icon" className="size-8" onClick={() => setReversing({ kind: "payments", id: p.id, label: `${money(p.amount)} on ${date(p.date)}` })} aria-label="Reverse"><Undo2 className="size-4" /></Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="received">
          <Card className="gap-0 overflow-hidden py-0">
            {l.disbursements.length === 0 ? <EmptyState icon={Banknote} title="Nothing received yet" description="Record each amount the bank releases. Building loans are often released in stages." /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Into</TableHead><TableHead className="hidden md:table-cell">Note</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                <TableBody>
                  {l.disbursements.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{date(d.date)}</TableCell>
                      <TableCell className="text-right font-semibold tabular">{money(d.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">{d.account}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{d.notes ?? ""}</TableCell>
                      <TableCell>{manage && <Button variant="ghost" size="icon" className="size-8" onClick={() => setReversing({ kind: "disbursements", id: d.id, label: `${money(d.amount)} received on ${date(d.date)}` })} aria-label="Reverse"><Undo2 className="size-4" /></Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card className="grid gap-6 p-6 sm:grid-cols-2">
            <Detail label="Security" value={l.security} />
            <Detail label="Guarantors / trustees" value={l.guarantors} />
            <Detail label="Council approval" value={l.approvalRef ? `${l.approvalRef}${l.approvedOn ? ` (${longDate(l.approvedOn)})` : ""}` : null} />
            <Detail label="Diocesan / head-office consent" value={l.consentRef} />
            <Detail label="Fees" value={l.fees ? money(l.fees) : null} />
            <Detail label="Notes" value={l.notes} />
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="p-6"><Attachments type="loan" id={l.id} canEdit={manage} title="Loan documents" hint="Offer letter, signed agreement, council minute, diocesan consent, bank statements" suggestions={["Offer letter", "Loan agreement", "Council minute", "Diocesan consent", "Bank statement"]} /></Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-6">
            <ol className="relative space-y-4 border-l-2 border-muted pl-6">
              {l.events.map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[31px] top-1 size-3 rounded-full border-2 border-card bg-primary" />
                  <p className="text-sm"><span className="font-medium capitalize">{e.type}</span>{e.note && <span className="text-muted-foreground"> · {e.note}</span>}</p>
                  <p className="text-xs text-muted-foreground">{e.at ? new Date(e.at).toLocaleString() : ""}{e.by ? ` · ${e.by}` : ""}</p>
                </li>
              ))}
            </ol>
          </Card>
        </TabsContent>
      </Tabs>

      {dialog === "edit" && <LoanDialog record={l} open onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "approve" && <ApproveDialog loan={l} open onOpenChange={(o) => !o && setDialog(null)} />}
      {(dialog === "receive" || dialog === "pay") && <EntryDialog loan={l} kind={dialog} open onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "restructure" && <RestructureDialog loan={l} open onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "delete" && (
        <ConfirmDialog open onOpenChange={(o) => !o && setDialog(null)} title="Delete this loan?" description="It has no money recorded against it. The schedule and history are removed."
          onConfirm={async () => { const ok = await runAction(() => del(`/loans/${l.id}`), "Loan deleted"); if (ok) { refreshLoans(); router.push("/loans") } return ok }} />
      )}
      {reversing && (
        <ConfirmDialog open onOpenChange={(o) => !o && setReversing(null)} title="Reverse this entry?" confirmLabel="Reverse"
          description={`${reversing.label}. Its journal entry is removed from the books and the balances recalculate.`}
          onConfirm={async () => { const ok = await runAction(() => del(`/loans/${l.id}/${reversing.kind}/${reversing.id}`), "Entry reversed"); if (ok) refreshLoans(); return ok }} />
      )}
    </Page>
  )
}

function Fig({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold tabular">{value}</p></div>
}
function Detail({ label, value }: { label: string; value: string | null }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-line text-sm">{value || <span className="text-muted-foreground">—</span>}</p></div>
}

/** Debt-free date: on schedule, at the giving rate, and what paying extra each month would save. */
function DebtFree({ loanId }: { loanId: string }) {
  const [extra, setExtra] = useState("")
  const [debounced, setDebounced] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(Number(extra) || 0), 300)
    return () => clearTimeout(t)
  }, [extra])
  const { data: p } = useApi<LoanProjection>(qs(`/loans/${loanId}/projection`, { extra: debounced || null }))
  if (!p) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />
  const monthLabel = (d: string | null) => (d ? new Date(`${d}T00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "—")
  return (
    <Card className="gap-0 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="size-5 text-gold" /> Debt-free</h2>
          <p className="text-sm text-muted-foreground">On schedule the loan is cleared by <b className="text-foreground">{monthLabel(p.endDate)}</b>.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="df-extra" className="text-xs text-muted-foreground">Pay extra each month ({CURRENCY})</Label>
            <Input id="df-extra" type="number" min="0" step="50000" className="w-48" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="e.g. 500000" />
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <StatCard label="Giving to the project" icon={CalendarClock} tone="info" value={money(p.givingPerMonth)}
          hint={p.givingCovers !== null ? `a month (last 3 months): ${p.givingCovers}% of the ${money(p.scheduledPerMonth)} repayment` : "a month (last 3 months)"} />
        <StatCard label={p.shortfallPerMonth > 0 ? "Gap to close each month" : "Giving covers the repayment"} icon={AlertTriangle} tone={p.shortfallPerMonth > 0 ? "danger" : "success"}
          value={p.shortfallPerMonth > 0 ? money(p.shortfallPerMonth) : "✓"} hint={p.shortfallPerMonth > 0 ? "comes from the general fund unless giving grows" : p.atGiving ? `At this rate: cleared ${monthLabel(p.atGiving.date)}` : undefined} />
        <StatCard label="If you pay extra" icon={Sparkles} tone="gold"
          value={p.withExtra ? monthLabel(p.withExtra.date) : "—"}
          hint={p.withExtra ? `${p.withExtra.monthsSaved ?? 0} months sooner${p.withExtra.interestSaved ? `, ${money(p.withExtra.interestSaved)} less interest` : ""}` : "Enter an amount to see"} />
      </div>
      {p.note && <p className="mt-3 text-xs text-muted-foreground">{p.note}</p>}
    </Card>
  )
}

function ApproveDialog({ loan, open, onOpenChange }: { loan: LoanDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [v, setV] = useState({ approvalRef: "", approvedOn: today(), consentRef: "" })
  const [error, setError] = useState<ApiError | null>(null)
  const [pending, setPending] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
    try {
      await post(`/loans/${loan.id}/approve`, { ...v, consentRef: v.consentRef || null })
      refreshLoans()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err : null)
    } finally {
      setPending(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Record the approval</DialogTitle><DialogDescription>Borrowing in the church&apos;s name needs the church council&apos;s resolution, and often the diocese&apos;s consent when church land is security.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="ap-ref">Council minute / resolution</Label><Input id="ap-ref" value={v.approvalRef} onChange={(e) => setV({ ...v, approvalRef: e.target.value })} placeholder="e.g. PCC min. 4/2026" required />{error?.field("approvalRef") && <p className="text-xs text-destructive">{error.field("approvalRef")}</p>}</div>
          <div className="space-y-2"><Label htmlFor="ap-on">Approved on</Label><Input id="ap-on" type="date" max={today()} value={v.approvedOn} onChange={(e) => setV({ ...v, approvedOn: e.target.value })} required /></div>
          <div className="space-y-2"><Label htmlFor="ap-con">Diocesan / head-office consent (optional)</Label><Input id="ap-con" value={v.consentRef} onChange={(e) => setV({ ...v, consentRef: e.target.value })} placeholder="Letter reference" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Approve"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Money received from the lender, or a repayment (split into principal and interest automatically). */
function EntryDialog({ loan, kind, open, onOpenChange }: { loan: LoanDetail; kind: "receive" | "pay"; open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = loan.summary
  const { data: accounts = [] } = useApi<Account[]>(open ? "/accounting/accounts" : null)
  const banks = accounts.filter((a) => a.type === "asset" && ["bank", "mobile_money", "cash"].includes(a.subtype ?? "") && a.active)
  const [v, setV] = useState({
    date: today(), amount: String(kind === "receive" ? s.undrawn : (s.nextInstallment?.amount ?? "")), accountId: loan.accountId ?? "", reference: "", notes: "",
    principal: "", interest: "", custom: false,
  })
  const [split, setSplit] = useState<{ principal: number; interest: number } | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [pending, setPending] = useState(false)
  useEffect(() => {
    if (kind !== "pay" || !(Number(v.amount) > 0)) return setSplit(null)
    const t = setTimeout(() => {
      fetchSplit(loan.id, Number(v.amount), v.date).then(setSplit).catch(() => setSplit(null))
    }, 300)
    return () => clearTimeout(t)
  }, [kind, loan.id, v.amount, v.date])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    const body: Record<string, unknown> = { date: v.date, amount: Number(v.amount), accountId: v.accountId && v.accountId !== "none" ? Number(v.accountId) : null, notes: v.notes || null }
    if (kind === "pay") {
      body.reference = v.reference || null
      if (v.custom) Object.assign(body, { principal: Number(v.principal || 0), interest: Number(v.interest || 0), fees: 0 })
    }
    try {
      await post(`/loans/${loan.id}/${kind === "pay" ? "payments" : "disbursements"}`, body)
      refreshLoans()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err : null)
    } finally {
      setPending(false)
    }
  }
  const fe = (k: string) => error?.field(k) && <p className="text-xs text-destructive">{error.field(k)}</p>
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{kind === "pay" ? "Record a repayment" : "Money received from the lender"}</DialogTitle>
          <DialogDescription>{kind === "pay" ? `To ${loan.lender}. Principal reduces the loan; interest is an expense of ${loan.project}.` : `${money(s.undrawn)} of the loan is still to come. It's added to the bank account and to the loan.`}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="en-d">Date</Label><Input id="en-d" type="date" max={today()} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} required />{fe("date")}</div>
            <div className="space-y-2"><Label htmlFor="en-a">Amount ({CURRENCY})</Label><Input id="en-a" type="number" min="0.01" step="0.01" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} required />{fe("amount")}</div>
          </div>
          {kind === "pay" && (
            <div className="rounded-xl border bg-secondary/40 p-3 text-sm">
              {!v.custom ? (
                <div className="flex items-center justify-between gap-2">
                  <span>{split ? <>Interest <b className="tabular">{money(split.interest)}</b> · principal <b className="tabular">{money(split.principal)}</b></> : "Interest that's due is paid first, then principal."}</span>
                  <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setV({ ...v, custom: true, principal: String(split?.principal ?? ""), interest: String(split?.interest ?? "") })}>Change</Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label htmlFor="en-pr" className="text-xs">Principal</Label><Input id="en-pr" type="number" min="0" step="0.01" value={v.principal} onChange={(e) => setV({ ...v, principal: e.target.value })} />{fe("principal")}</div>
                  <div className="space-y-1"><Label htmlFor="en-in" className="text-xs">Interest & fees</Label><Input id="en-in" type="number" min="0" step="0.01" value={v.interest} onChange={(e) => setV({ ...v, interest: e.target.value })} /></div>
                  <p className="col-span-2 text-xs text-muted-foreground">Use the split on the bank&apos;s statement. The two must add up to the amount.</p>
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="en-acc">{kind === "pay" ? "Paid from" : "Received into"}</Label>
            <Select value={v.accountId || "none"} onValueChange={(x) => x && setV({ ...v, accountId: x })}>
              <SelectTrigger id="en-acc" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Bank – current account</SelectItem>{banks.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} {a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {kind === "pay" && <div className="space-y-2"><Label htmlFor="en-ref">Bank receipt / reference</Label><Input id="en-ref" value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} /></div>}
          <div className="space-y-2"><Label htmlFor="en-n">Note</Label><Input id="en-n" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} placeholder={kind === "receive" ? "e.g. Second tranche after roofing" : ""} /></div>
          {error && !Object.keys(error.errors).length && <p className="text-sm text-destructive">{error.message}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Posting…" : kind === "pay" ? "Record repayment" : "Record money received"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

async function fetchSplit(id: string, amount: number, on: string) {
  const r = await api<{ data: { principal: number; interest: number } }>(qs(`/loans/${id}/suggest`, { amount, date: on }))
  return r.data
}

function RestructureDialog({ loan, open, onOpenChange }: { loan: LoanDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [v, setV] = useState({ annualRate: String(loan.annualRate), termPeriods: "", note: "" })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const owed = loan.summary.outstanding + loan.summary.undrawn
  const unit = loan.frequency === "monthly" ? "months" : "quarters"
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
    try {
      await post(`/loans/${loan.id}/restructure`, { annualRate: Number(v.annualRate), termPeriods: Number(v.termPeriods), note: v.note || null })
      refreshLoans()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err : null)
    } finally {
      setPending(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Restructure the loan</DialogTitle><DialogDescription>New terms from today for the {money(owed)} still owed, for example after the bank cuts the rate or extends the term. Paid instalments stay as they are.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="rs-r">New rate (% a year)</Label><Input id="rs-r" type="number" min="0" step="0.01" value={v.annualRate} onChange={(e) => setV({ ...v, annualRate: e.target.value })} required /></div>
            <div className="space-y-2"><Label htmlFor="rs-n">Over how many {unit}</Label><Input id="rs-n" type="number" min="1" value={v.termPeriods} onChange={(e) => setV({ ...v, termPeriods: e.target.value })} required />{error?.field("termPeriods") && <p className="text-xs text-destructive">{error.field("termPeriods")}</p>}</div>
          </div>
          <div className="space-y-2"><Label htmlFor="rs-note">Reason</Label><Input id="rs-note" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="e.g. Bank letter of 3 Nov: rate cut to 16%" /></div>
          {error && !Object.keys(error.errors).length && <p className="text-sm text-destructive">{error.message}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Recalculating…" : "Restructure"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
