"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { Banknote, Plus, AlertTriangle, CalendarClock, TrendingDown, Percent, CheckCircle2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState, Page, PageHeader, StatCard } from "@/components/page"
import { ApiError, api, patch, post, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { CURRENCY, date, money, today } from "@/lib/format"
import type { Account, Loan, LoanMethod, LoanPreview, LoanStats, Organisation, Project } from "@/lib/types"
import { cn } from "@/lib/utils"

export const refreshLoans = () => mutate((k) => typeof k === "string" && (k.startsWith("/loans") || k.startsWith("/accounting") || k.startsWith("/projects") || k.startsWith("/dashboard")))
export const LOAN_STATUS = {
  proposed: { label: "Proposed", variant: "outline" },
  approved: { label: "Approved", variant: "info" },
  active: { label: "Repaying", variant: "warning" },
  closed: { label: "Repaid", variant: "success" },
} as const
export const METHOD_LABEL: Record<LoanMethod, string> = { reducing: "Reducing balance", flat: "Flat rate", none: "No interest" }

type LoansIndex = { data: Loan[]; stats: LoanStats }

/** The church's loans: what is owed, what's due next and how repayment is going. */
export function LoansContent() {
  const router = useRouter()
  const { can } = useAuth()
  const [creating, setCreating] = useState(false)
  // the list endpoint returns { data, stats }, so read the whole body rather than unwrapping `data`
  const { data: res } = useSWR<LoansIndex>("/loans", (p: string) => api<LoansIndex>(p))
  const loans = res?.data ?? []
  const s = res?.stats

  return (
    <Page>
      <PageHeader
        eyebrow="Finance"
        title="Loans"
        description="Money the church has borrowed for its projects: terms, council approval, what's been received and repaid, and when the church will be debt-free."
        actions={can("finance.manage") && <Button onClick={() => setCreating(true)}><Plus className="size-4" /> New loan</Button>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Still owed" icon={Banknote} value={s && money(s.owed)} hint={s && (s.undrawn ? `+ ${money(s.undrawn)} not yet received` : `${s.active} loan${s.active === 1 ? "" : "s"}`)} />
        <StatCard label="Next instalment" icon={CalendarClock} tone="gold" value={s?.nextDue ? money(s.nextDue.amount) : s && "—"} hint={s?.nextDue ? `Due ${date(s.nextDue.dueDate)}` : "Nothing due"} />
        <StatCard label="In arrears" icon={AlertTriangle} tone="danger" value={s && money(s.arrears)} hint={s && (s.arrears ? "Overdue repayments" : "All up to date")} />
        <StatCard label="Repaid so far" icon={TrendingDown} tone="success" value={s && money(s.repaid)} hint={s && `+ ${money(s.interestPaid)} interest paid`} />
      </section>

      {!res ? <div className="h-48 animate-pulse rounded-2xl bg-muted" /> : loans.length === 0 ? (
        <Card className="py-0"><EmptyState icon={Banknote} title="No loans recorded" description="Record a bank or SACCO loan for a project to track its schedule, repayments and debt-free date." /></Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {loans.map((l) => {
            const sum = l.summary
            const base = Math.max(sum.disbursed, l.principal)
            return (
              <Card key={l.id} className="cursor-pointer gap-0 p-5 transition hover:-translate-y-0.5 hover:border-primary/25" onClick={() => router.push(`/loans/view?id=${l.id}`)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{l.lender}</h3><Badge variant={LOAN_STATUS[l.status].variant}>{LOAN_STATUS[l.status].label}</Badge></div>
                    <p className="truncate text-sm text-muted-foreground">{l.purpose} · {l.project}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">{METHOD_LABEL[l.interestMethod]}{l.interestMethod !== "none" && <> · {l.annualRate}%</>}<br />{l.termPeriods} {l.frequency === "monthly" ? "months" : "quarters"}</div>
                </div>
                <div className="mt-5">
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span><span className="text-xl font-semibold tabular">{money(sum.outstanding + sum.undrawn)}</span> <span className="text-muted-foreground">still owed of {money(base)}</span></span>
                    <span className="font-semibold tabular">{Math.round(sum.progress)}% repaid</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", l.status === "closed" ? "bg-success" : "bg-primary")} style={{ width: `${Math.min(100, sum.progress)}%` }} /></div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
                  {sum.arrears.count > 0 ? (
                    <span className="flex items-center gap-1.5 font-medium text-destructive"><AlertTriangle className="size-4" /> {money(sum.arrears.amount)} overdue</span>
                  ) : sum.nextInstallment && l.status === "active" ? (
                    <span className="text-muted-foreground">Next: <span className="font-semibold text-foreground tabular">{money(sum.nextInstallment.amount)}</span> on {date(sum.nextInstallment.dueDate)}</span>
                  ) : l.status === "closed" ? <span className="flex items-center gap-1.5 text-success"><CheckCircle2 className="size-4" /> Fully repaid</span>
                    : <span className="text-muted-foreground">{l.status === "proposed" ? "Waiting for council approval" : "Approved: record money when received"}</span>}
                  {sum.endDate && l.status !== "closed" && <span className="text-xs text-muted-foreground">Last instalment {date(sum.endDate)}</span>}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {creating && <LoanDialog open onOpenChange={(o) => !o && setCreating(false)} onSaved={(id) => router.push(`/loans/view?id=${id}`)} />}
    </Page>
  )
}

/** New loan, or edit one that hasn't received money yet. Shows the repayments and affordability as you type. */
export function LoanDialog({ record, open, onOpenChange, onSaved }: { record?: Loan; open: boolean; onOpenChange: (o: boolean) => void; onSaved?: (id: string) => void }) {
  const { data: projects = [] } = useApi<Project[]>(open ? "/projects" : null)
  const { data: orgs = [] } = useApi<Organisation[]>(open ? "/organisations" : null)
  const { data: accounts = [] } = useApi<Account[]>(open ? "/accounting/accounts" : null)
  const lenders = orgs.filter((o) => ["bank", "sacco", "church", "ngo", "company", "government"].includes(o.type))
  const banks = accounts.filter((a) => a.type === "asset" && ["bank", "mobile_money", "cash"].includes(a.subtype ?? "") && a.active)
  const locked = record && !["proposed", "approved"].includes(record.status)

  const [f, setF] = useState(() => ({
    projectId: record?.projectId ?? "", organisationId: record?.organisationId ?? "", lenderName: record?.lenderName ?? "", accountNumber: record?.accountNumber ?? "",
    purpose: record?.purpose ?? "", principal: record ? String(record.principal) : "", interestMethod: (record?.interestMethod ?? "reducing") as LoanMethod,
    annualRate: record ? String(record.annualRate) : "", termPeriods: record ? String(record.termPeriods) : "24", frequency: record?.frequency ?? "monthly",
    gracePeriods: record ? String(record.gracePeriods) : "0", startDate: record?.startDate ?? today(), fees: record?.fees ? String(record.fees) : "",
    accountId: record?.accountId ?? "", security: record?.security ?? "", guarantors: record?.guarantors ?? "", notes: record?.notes ?? "",
  }))
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }))
  const [preview, setPreview] = useState<LoanPreview | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [pending, setPending] = useState(false)

  const terms = { principal: Number(f.principal), interestMethod: f.interestMethod, annualRate: f.interestMethod === "none" ? 0 : Number(f.annualRate || 0),
    termPeriods: Number(f.termPeriods), frequency: f.frequency, gracePeriods: Number(f.gracePeriods || 0), startDate: f.startDate }
  const termsKey = JSON.stringify(terms)
  useEffect(() => {
    if (!(terms.principal > 0 && terms.termPeriods > 0 && terms.startDate)) return setPreview(null)
    const t = setTimeout(() => post<{ data: LoanPreview }>("/loans/preview", terms).then((r) => setPreview(r.data)).catch(() => setPreview(null)), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termsKey])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    const body = {
      ...(locked ? {} : terms), projectId: Number(f.projectId) || undefined, organisationId: f.organisationId && f.organisationId !== "none" ? Number(f.organisationId) : null,
      lenderName: f.lenderName || null, accountNumber: f.accountNumber || null, purpose: f.purpose, fees: f.fees ? Number(f.fees) : null,
      accountId: f.accountId && f.accountId !== "none" ? Number(f.accountId) : null, security: f.security || null, guarantors: f.guarantors || null, notes: f.notes || null,
    }
    try {
      if (record) {
        await patch(`/loans/${record.id}`, body)
        refreshLoans()
        onOpenChange(false)
      } else {
        const r = await post<{ data: { id: string } }>("/loans", body)
        refreshLoans()
        onOpenChange(false)
        onSaved?.(r.data.id)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err : null)
    } finally {
      setPending(false)
    }
  }
  const fe = (k: string) => error?.field(k) && <p className="text-xs text-destructive">{error.field(k)}</p>
  const unit = f.frequency === "monthly" ? "month" : "quarter"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{record ? `Edit loan from ${record.lender}` : "New loan"}</DialogTitle>
          <DialogDescription>{locked ? "Money has been received, so the terms are fixed. Use Restructure on the loan page to change them." : "Enter the terms from the bank's offer letter. The repayment schedule is worked out for you."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ln-proj">For the project</Label>
              <Select value={f.projectId} onValueChange={(v) => v && set("projectId", v)}>
                <SelectTrigger id="ln-proj" className="w-full"><SelectValue placeholder="Choose a project" /></SelectTrigger>
                <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>{fe("projectId")}
            </div>
            <div className="space-y-2"><Label htmlFor="ln-purpose">What it pays for</Label><Input id="ln-purpose" value={f.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="e.g. Roofing and windows" required />{fe("purpose")}</div>
            <div className="space-y-2">
              <Label htmlFor="ln-org">Lender</Label>
              <Select value={f.organisationId || "none"} onValueChange={(v) => v && set("organisationId", v)}>
                <SelectTrigger id="ln-org" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Type the name instead…</SelectItem>{lenders.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
              {(!f.organisationId || f.organisationId === "none") && <Input aria-label="Lender name" value={f.lenderName} onChange={(e) => set("lenderName", e.target.value)} placeholder="e.g. Stanbic Bank, Ntinda branch" />}
              {fe("lenderName")}
            </div>
            <div className="space-y-2"><Label htmlFor="ln-acno">Loan account / reference</Label><Input id="ln-acno" value={f.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} placeholder="From the offer letter" /></div>

            <fieldset disabled={!!locked} className="grid gap-4 rounded-xl border p-4 sm:col-span-2 sm:grid-cols-3 disabled:opacity-60">
              <legend className="px-1 text-sm font-semibold">Terms</legend>
              <div className="space-y-2"><Label htmlFor="ln-p">Amount ({CURRENCY})</Label><Input id="ln-p" type="number" min="1" value={f.principal} onChange={(e) => set("principal", e.target.value)} required />{fe("principal")}</div>
              <div className="space-y-2">
                <Label htmlFor="ln-m">Interest</Label>
                <Select value={f.interestMethod} onValueChange={(v) => v && set("interestMethod", v)}>
                  <SelectTrigger id="ln-m" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(METHOD_LABEL) as LoanMethod[]).map((m) => <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="ln-r">Rate (% a year)</Label><Input id="ln-r" type="number" min="0" step="0.01" value={f.interestMethod === "none" ? "" : f.annualRate} disabled={f.interestMethod === "none"} onChange={(e) => set("annualRate", e.target.value)} required={f.interestMethod !== "none"} />{fe("annualRate")}</div>
              <div className="space-y-2">
                <Label htmlFor="ln-fq">Repaid</Label>
                <Select value={f.frequency} onValueChange={(v) => v && set("frequency", v)}>
                  <SelectTrigger id="ln-fq" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="ln-n">Over how many {unit}s</Label><Input id="ln-n" type="number" min="1" max="600" value={f.termPeriods} onChange={(e) => set("termPeriods", e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="ln-g">Grace ({unit}s, interest only)</Label><Input id="ln-g" type="number" min="0" max="60" value={f.gracePeriods} onChange={(e) => set("gracePeriods", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="ln-sd">Start date</Label><Input id="ln-sd" type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} required /><p className="text-[11px] text-muted-foreground">First instalment one {unit} later.</p></div>
              <div className="space-y-2"><Label htmlFor="ln-fee">Fees ({CURRENCY})</Label><Input id="ln-fee" type="number" min="0" value={f.fees} onChange={(e) => set("fees", e.target.value)} placeholder="Arrangement, legal…" /></div>
              <div className="space-y-2">
                <Label htmlFor="ln-acc">Paid from / into</Label>
                <Select value={f.accountId || "none"} onValueChange={(v) => v && set("accountId", v)}>
                  <SelectTrigger id="ln-acc" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Bank – current account</SelectItem>{banks.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} {a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </fieldset>

            <div className="space-y-2"><Label htmlFor="ln-sec">Security</Label><Textarea id="ln-sec" rows={2} value={f.security} onChange={(e) => set("security", e.target.value)} placeholder="e.g. Land title Block 12 Plot 345 (church land)" /></div>
            <div className="space-y-2"><Label htmlFor="ln-gua">Guarantors / trustees</Label><Textarea id="ln-gua" rows={2} value={f.guarantors} onChange={(e) => set("guarantors", e.target.value)} placeholder="Registered trustees who signed" /></div>
          </div>

          <aside className="space-y-3">
            <h3 className="text-sm font-semibold">Repayments</h3>
            {!preview ? <p className="rounded-xl bg-muted px-3 py-6 text-center text-sm text-muted-foreground">Enter the amount and term to see the repayments.</p> : (
              <>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Each {unit}</p>
                  <p className="text-2xl font-semibold tabular">{money(preview.installment)}</p>
                  {preview.graceInstallment !== null && <p className="text-xs text-muted-foreground">{money(preview.graceInstallment)} a {unit} during the grace period</p>}
                </div>
                <dl className="space-y-1.5 rounded-xl border p-3 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Total interest</dt><dd className="tabular">{money(preview.totalInterest)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Total to repay</dt><dd className="font-semibold tabular">{money(preview.totalRepayable)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Last instalment</dt><dd className="tabular">{date(preview.endDate)}</dd></div>
                </dl>
                <div className={cn("rounded-xl border p-3 text-sm", preview.affordable === false ? "border-destructive/40 bg-destructive/5" : preview.affordable ? "border-success/40 bg-success/5" : "")}>
                  <p className="flex items-center gap-1.5 font-semibold"><Percent className="size-4" /> Can the church afford it?</p>
                  {preview.ratio === null ? <p className="mt-1 text-muted-foreground">No income recorded in the last 12 months to compare with.</p> : (
                    <>
                      <p className="mt-1">A year of repayments ({money(preview.annualRepayment)}) is <b>{preview.ratio}%</b> of the last 12 months&apos; income ({money(preview.incomeLast12Months)}).</p>
                      <p className={cn("mt-1 text-xs", preview.affordable ? "text-success" : "text-destructive")}>{preview.affordable ? `Within the ${preview.limit}% guide.` : `Above the ${preview.limit}% guide. Consider a longer term, a smaller loan or a giving drive first.`}</p>
                    </>
                  )}
                </div>
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" />Money can only be recorded as received after the church council&apos;s approval is entered.</p>
              </>
            )}
          </aside>

          {error && !Object.keys(error.errors).length && <p className="text-sm text-destructive lg:col-span-2">{error.message}</p>}
          <DialogFooter className="lg:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !f.projectId}>{pending ? "Saving…" : record ? "Save changes" : "Create loan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
