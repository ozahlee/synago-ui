"use client"

import Link from "next/link"
import { useState } from "react"
import { mutate } from "swr"
import { ArrowLeft, Banknote, CheckCircle2, ChevronDown, Landmark, Pencil, Plus, Printer, Send, Trash2, Undo2, UserMinus, UserPlus, Users, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, StatCard, TableCard } from "@/components/page"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { MemberPicker } from "@/components/member-picker"
import { PassportPhoto } from "@/components/council-content"
import { runAction } from "@/components/form"
import { del, patch, post, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlParam } from "@/lib/use-url-param"
import { CURRENCY, date, money, today } from "@/lib/format"
import { PAYMENT_METHODS, type Payee, type PayLineT, type PayrollRun, type PayrollRunRow, type PayslipT, type Remittance } from "@/lib/types"
import { cn } from "@/lib/utils"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/payroll") || k.startsWith("/dashboard") || k.startsWith("/accounting")))
export const monthName = (p: string) => new Date(`${p}-01T00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })
const KIND: Record<Payee["kind"], string> = { clergy: "Clergy", employee: "Employees", casual: "Casual workers", council: "Council allowances" }
const KIND_ONE: Record<Payee["kind"], string> = { clergy: "Clergy", employee: "Employee", casual: "Casual worker", council: "Council member" }
const BASIS: Record<Payee["basis"], string> = { monthly: "Monthly pay", daily: "Daily rate", sitting: "Per sitting", both: "Per sitting + monthly" }
const STATUS: Record<PayrollRunRow["status"], { label: string; variant: "muted" | "info" | "gold" | "success" }> = {
  draft: { label: "Being prepared", variant: "muted" }, submitted: { label: "With the vicar", variant: "info" }, approved: { label: "Approved, to pay", variant: "gold" }, paid: { label: "Paid", variant: "success" },
}

/** Payroll: the treasurer prepares the month, the vicar approves, the treasurer pays; NSSF and PAYE are remitted after. */
export function PayrollContent() {
  const { can } = useAuth()
  const manage = can("payroll.manage")
  const [tab, setTab] = useState("runs")
  useUrlParam("tab", setTab)
  const [run, setRun] = useState<string | null>(null)
  useUrlParam("run", setRun)
  return (
    <Page>
      <PageHeader eyebrow="Finance" title="Payroll" description="Salaries, stipends, wages and council allowances. The treasurer prepares each month, the vicar approves it, and paying it records everything in the books, including the NSSF and PAYE owed." />
      {run ? <RunView id={run} onBack={() => setRun(null)} /> : (
        <>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="runs">Pay runs</TabsTrigger>
              <TabsTrigger value="people">People paid</TabsTrigger>
              <TabsTrigger value="remittances">NSSF & PAYE</TabsTrigger>
            </TabsList>
          </Tabs>
          {tab === "runs" && <Runs manage={manage} onOpen={setRun} />}
          {tab === "people" && <People manage={manage} />}
          {tab === "remittances" && <Remittances manage={manage} />}
        </>
      )}
    </Page>
  )
}

// ---------------------------------------------------------------- runs

function Runs({ manage, onOpen }: { manage: boolean; onOpen: (id: string) => void }) {
  const { data } = useApi<PayrollRunRow[]>("/payroll/runs")
  const [period, setPeriod] = useState(today().slice(0, 7))
  const exists = data?.some((r) => r.period === period)
  const last = data?.find((r) => r.status === "paid")
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Last month paid" icon={Banknote} value={last ? money(last.net) : "—"} hint={last ? `${monthName(last.period)} · ${last.people} people` : "Nothing paid yet"} />
        <StatCard label="Cost to the church" icon={Wallet} tone="gold" value={last ? money(last.gross + last.employerNssf) : "—"} hint="Gross pay + church NSSF (10%)" />
        <StatCard label="NSSF that month" icon={Landmark} tone="info" value={last ? money(last.nssf) : "—"} hint="5% employee + 10% church" />
        <StatCard label="PAYE that month" icon={Landmark} tone="info" value={last ? money(last.paye) : "—"} hint="Remit to URA by the 15th" />
      </section>
      <TableCard title="Pay runs" count={data?.length} actions={manage && (
        <div className="flex items-center gap-2">
          <Input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="h-9 w-40" aria-label="Month" />
          <Button disabled={!!exists} onClick={async () => {
            let id = ""
            if (await runAction(async () => { id = (await post<{ data: PayrollRun }>("/payroll/runs", { period })).data.id }, `${monthName(period)} payroll started`)) (refresh(), onOpen(id))
          }}><Plus className="size-4" /> Prepare {monthName(period)}</Button>
        </div>
      )}>
        {!data ? <div className="m-6 h-32 animate-pulse rounded-xl bg-muted" /> : data.length === 0 ? (
          <EmptyState icon={Banknote} title="No payroll yet" description="Add the people the church pays under People paid, then prepare the month." />
        ) : (
          <ul className="divide-y">
            {data.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => onOpen(r.id)} className="grid w-full items-center gap-3 px-6 py-3 text-left transition hover:bg-muted/50 sm:grid-cols-[1.2fr_1fr_repeat(3,minmax(0,0.8fr))]">
                  <div><p className="font-semibold">{monthName(r.period)}</p><p className="text-xs text-muted-foreground">{r.people} people{r.paidOn ? ` · paid ${date(r.paidOn)}` : ""}</p></div>
                  <div><Badge variant={STATUS[r.status].variant}>{STATUS[r.status].label}</Badge>{r.returnedNote && r.status === "draft" && <p className="mt-0.5 text-xs text-warning">Returned: {r.returnedNote}</p>}</div>
                  <p className="text-sm sm:text-right"><span className="text-xs text-muted-foreground sm:hidden">Gross </span>{money(r.gross)}</p>
                  <p className="text-sm sm:text-right"><span className="text-xs text-muted-foreground sm:hidden">NSSF + PAYE </span>{money(r.nssf + r.paye)}</p>
                  <p className="font-semibold sm:text-right"><span className="text-xs font-normal text-muted-foreground sm:hidden">Net </span>{money(r.net)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </TableCard>
    </>
  )
}

function RunView({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: r, mutate: reload } = useApi<PayrollRun>(`/payroll/runs/${id}`)
  const [editing, setEditing] = useState<PayslipT | null>(null)
  const [paying, setPaying] = useState(false)
  const [returning, setReturning] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [adding, setAdding] = useState(false)
  const done = (x?: { data: PayrollRun }) => { if (x) reload(x, false); else reload(); refresh() }
  if (!r) return <div className="h-96 animate-pulse rounded-2xl bg-muted" />
  const groups = (["clergy", "employee", "casual", "council"] as const).map((k) => [k, r.slips.filter((s) => s.kind === k)] as const).filter(([, s]) => s.length)
  const setCount = async (s: PayslipT, field: "sittings" | "days", v: string) => {
    const n = Math.max(0, Number(v) || 0)
    if (n === s[field]) return
    try { done(await patch<{ data: PayrollRun }>(`/payroll/slips/${s.id}`, { [field]: n })) } catch (e) { runAction(() => Promise.reject(e), "") }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back"><ArrowLeft className="size-4" /></Button>
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold">{monthName(r.period)} <Badge variant={STATUS[r.status].variant}>{STATUS[r.status].label}</Badge></h2>
            <p className="text-sm text-muted-foreground">
              {r.preparedBy ? `Prepared by ${r.preparedBy}` : "Not yet sent"}{r.approvedBy ? ` · approved by ${r.approvedBy}` : ""}{r.paidOn ? ` · paid ${date(r.paidOn)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link href={`/payroll/payslip?run=${r.id}`} target="_blank"><Printer className="size-4" /> Payslips</Link></Button>
          {r.can.delete && <Button variant="ghost" className="text-destructive" onClick={() => setRemoving(true)}><Trash2 className="size-4" /> Delete</Button>}
          {r.can.edit && <Button variant="outline" onClick={() => setAdding(true)}><UserPlus className="size-4" /> Add someone</Button>}
          {r.can.submit && <Button onClick={async () => { if (await runAction(() => post(`/payroll/runs/${r.id}/submit`), "Sent to the vicar for approval")) done() }}><Send className="size-4" /> Send for approval</Button>}
          {r.can.approve && <>
            <Button variant="outline" onClick={() => setReturning(true)}><Undo2 className="size-4" /> Return</Button>
            <Button onClick={async () => { if (await runAction(() => post(`/payroll/runs/${r.id}/decide`, { decision: "approve" }), "Payroll approved")) done() }}><CheckCircle2 className="size-4" /> Approve</Button>
          </>}
          {r.can.pay && <Button onClick={() => setPaying(true)}><Banknote className="size-4" /> Record payment</Button>}
        </div>
      </div>
      {r.status === "draft" && r.returnedNote && <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-2 text-sm"><b>Returned by the vicar:</b> {r.returnedNote}</p>}
      {r.status === "submitted" && !r.can.approve && <p className="rounded-xl bg-info/10 px-4 py-2 text-sm text-info">Waiting for the vicar&apos;s approval. Whoever prepares the payroll can&apos;t approve it.</p>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Net pay" icon={Banknote} value={money(r.net)} hint={`${r.people} people`} />
        <StatCard label="Gross pay" icon={Wallet} value={money(r.gross)} hint={r.deductions ? `${money(r.deductions)} other deductions` : "Before deductions"} />
        <StatCard label="Cost to the church" icon={Wallet} tone="gold" value={money(r.cost)} hint="Gross + church NSSF 10%" />
        <StatCard label="NSSF + PAYE owed" icon={Landmark} tone="info" value={money(r.nssf + r.paye)} hint={`NSSF ${money(r.nssf)} · PAYE ${money(r.paye)}`} />
      </section>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <th className="px-5 py-3 text-left">Person</th><th className="px-3 py-3 text-center">Sittings / days</th><th className="px-3 py-3 text-right">Gross</th>
              <th className="px-3 py-3 text-right">NSSF 5%</th><th className="px-3 py-3 text-right">PAYE</th><th className="px-3 py-3 text-right">Other</th><th className="px-3 py-3 text-right">Net</th><th className="w-0" />
            </tr></thead>
            {groups.map(([k, slips]) => (
              <tbody key={k}>
                <tr className="bg-muted/40"><td colSpan={8} className="px-5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{KIND[k]} · {money(slips.reduce((a, s) => a + s.net, 0))} net</td></tr>
                {slips.map((s) => (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        <PassportPhoto url={s.photoUrl} name={s.name} className="w-8" />
                        <div className="min-w-0"><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.role ?? KIND_ONE[s.kind]} · {s.paymentMethod}{s.account ? ` ${s.account}` : ""}</p></div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {s.basis === "sitting" || s.basis === "both" ? (
                        <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Input type="number" min={0} disabled={!r.can.edit} defaultValue={s.sittings || ""} placeholder="0" onBlur={(e) => setCount(s, "sittings", e.target.value)} className="h-8 w-16 text-center tabular" aria-label={`${s.name} sittings`} />
                          × {money(s.sittingRate ?? 0)}
                        </label>
                      ) : s.basis === "daily" ? (
                        <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Input type="number" min={0} step="0.5" disabled={!r.can.edit} defaultValue={s.days || ""} placeholder="0" onBlur={(e) => setCount(s, "days", e.target.value)} className="h-8 w-16 text-center tabular" aria-label={`${s.name} days`} />
                          days × {money(s.dailyRate ?? 0)}
                        </label>
                      ) : <span className="text-xs text-muted-foreground">monthly</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular">{money(s.gross)}</td>
                    <td className="px-3 py-2 text-right tabular text-muted-foreground">{s.nssfOn ? money(s.nssfEmployee) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular text-muted-foreground">{s.payeOn ? money(s.paye) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular text-muted-foreground">{s.deductions ? money(s.deductions) : "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular">{money(s.net)}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="size-8" asChild><Link href={`/payroll/payslip?id=${s.id}`} target="_blank" aria-label="Payslip"><Printer className="size-4" /></Link></Button>
                        {r.can.edit && <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(s)} aria-label="Change this month"><Pencil className="size-4" /></Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
            <tfoot><tr className="bg-primary/5 font-semibold">
              <td className="px-5 py-3 text-primary">Total</td><td /><td className="px-3 py-3 text-right tabular">{money(r.gross)}</td>
              <td className="px-3 py-3 text-right tabular">{money(r.nssf - r.employerNssf)}</td><td className="px-3 py-3 text-right tabular">{money(r.paye)}</td>
              <td className="px-3 py-3 text-right tabular">{money(r.deductions)}</td><td className="px-3 py-3 text-right text-lg tabular text-primary">{money(r.net)}</td><td />
            </tr></tfoot>
          </table>
        </div>
        <p className="border-t px-5 py-2.5 text-xs text-muted-foreground">The church also pays NSSF of {money(r.employerNssf)} (10%). NSSF and PAYE are due by the 15th of next month; they appear under NSSF & PAYE once this is paid.</p>
      </Card>

      {editing && <SlipForm slip={editing} onClose={() => setEditing(null)} onDone={(x) => (done(x), setEditing(null))} />}
      {paying && <PayForm run={r} onClose={() => setPaying(false)} onDone={() => (done(), setPaying(false))} />}
      {returning && <ReturnForm run={r} onClose={() => setReturning(false)} onDone={() => (done(), setReturning(false))} />}
      {adding && <AddToRun run={r} onClose={() => setAdding(false)} onDone={(x) => (done(x), setAdding(false))} />}
      {removing && <ConfirmDialog open onOpenChange={(o) => !o && setRemoving(false)} title={`Delete the ${monthName(r.period)} draft?`} description="Nothing has been paid or recorded yet." confirmLabel="Delete"
        onConfirm={async () => { const ok = await runAction(() => del(`/payroll/runs/${r.id}`), "Draft deleted"); if (ok) (refresh(), onBack()); return ok }} />}
    </div>
  )
}

function LinesEditor({ lines, onChange, deductionsOnly }: { lines: PayLineT[]; onChange: (l: PayLineT[]) => void; deductionsOnly?: boolean }) {
  const set = (i: number, k: keyof PayLineT, v: string) => onChange(lines.map((l, j) => (j === i ? { ...l, [k]: k === "amount" ? Number(v) || 0 : v } : l)))
  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[110px_1fr_120px_32px] gap-2">
          <Select value={l.kind} onValueChange={(v) => v && set(i, "kind", v)}><SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="earning">Earning</SelectItem><SelectItem value="deduction">Deduction</SelectItem></SelectContent></Select>
          <Input value={l.name} onChange={(e) => set(i, "name", e.target.value)} placeholder={l.kind === "earning" ? "e.g. Basic, Housing, Transport" : "e.g. Welfare, Advance"} aria-label="Line" />
          <Input type="number" min={0} value={l.amount || ""} onChange={(e) => set(i, "amount", e.target.value)} placeholder={CURRENCY} className="text-right tabular" aria-label="Amount" />
          <Button type="button" size="icon" variant="ghost" className="size-9" onClick={() => onChange(lines.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-4" /></Button>
        </div>
      ))}
      <div className="flex gap-2">
        {!deductionsOnly && <Button type="button" size="sm" variant="outline" onClick={() => onChange([...lines, { kind: "earning", name: "", amount: 0 }])}><Plus className="size-4" /> Earning</Button>}
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...lines, { kind: "deduction", name: "", amount: 0 }])}><Plus className="size-4" /> Deduction</Button>
      </div>
    </div>
  )
}

function SlipForm({ slip, onClose, onDone }: { slip: PayslipT; onClose: () => void; onDone: (x: { data: PayrollRun }) => void }) {
  const [lines, setLines] = useState<PayLineT[]>(slip.lines.filter((l) => !l.auto))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>{slip.name}: this month only</DialogTitle><DialogDescription>Change or add lines for this month (overtime, a bonus, an advance recovered). Their standing pay stays as it is.</DialogDescription></DialogHeader>
        <LinesEditor lines={lines} onChange={setLines} />
        {slip.lines.some((l) => l.auto) && <p className="text-xs text-muted-foreground">Worked out from the count: {slip.lines.filter((l) => l.auto).map((l) => `${l.name} = ${money(l.amount)}`).join(" · ")}</p>}
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => { let x: { data: PayrollRun } | null = null; if (await runAction(async () => { x = await patch<{ data: PayrollRun }>(`/payroll/slips/${slip.id}`, { lines: lines.filter((l) => l.name.trim()) }) }, "Updated")) onDone(x!) }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PayForm({ run, onClose, onDone }: { run: PayrollRun; onClose: () => void; onDone: () => void }) {
  const [d, setD] = useState(today())
  const by = Object.entries(run.slips.reduce<Record<string, number>>((a, s) => ({ ...a, [s.paymentMethod]: (a[s.paymentMethod] ?? 0) + s.net }), {}))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Record the {monthName(run.period)} payment</DialogTitle><DialogDescription>Once everyone has been paid. This records the month in the books: pay as an expense, money out of each account, and NSSF and PAYE as owed.</DialogDescription></DialogHeader>
        <ul className="divide-y rounded-xl border text-sm">{by.map(([m, v]) => <li key={m} className="flex justify-between px-3 py-2"><span>{m}</span><b className="tabular">{money(v)}</b></li>)}</ul>
        <div className="space-y-2"><Label htmlFor="py-d">Paid on</Label><Input id="py-d" type="date" max={today()} value={d} onChange={(e) => setD(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => { if (await runAction(() => post(`/payroll/runs/${run.id}/pay`, { date: d }), "Payroll paid and recorded")) onDone() }}>Record payment</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReturnForm({ run, onClose, onDone }: { run: PayrollRun; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Return to the treasurer</DialogTitle><DialogDescription>Say what needs changing; the treasurer is told and can send it again.</DialogDescription></DialogHeader>
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. The askari worked 21 days, not 20" />
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!note.trim()} onClick={async () => { if (await runAction(() => post(`/payroll/runs/${run.id}/decide`, { decision: "return", note }), "Returned to the treasurer")) onDone() }}>Return</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddToRun({ run, onClose, onDone }: { run: PayrollRun; onClose: () => void; onDone: (x: { data: PayrollRun }) => void }) {
  const { data = [] } = useApi<Payee[]>("/payroll/payees")
  const missing = data.filter((p) => !run.slips.some((s) => s.payeeId === p.id))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add someone to {monthName(run.period)}</DialogTitle><DialogDescription>People paid who aren&apos;t on this month yet (e.g. started mid-month).</DialogDescription></DialogHeader>
        {missing.length === 0 ? <p className="text-sm text-muted-foreground">Everyone is on it. Add new people under People paid first.</p> : (
          <ul className="divide-y rounded-xl border">{missing.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm"><span>{p.name} <span className="text-muted-foreground">· {p.role ?? KIND_ONE[p.kind]}</span></span>
              <Button size="sm" variant="outline" onClick={async () => { let x: { data: PayrollRun } | null = null; if (await runAction(async () => { x = await post<{ data: PayrollRun }>(`/payroll/runs/${run.id}/slips`, { payeeId: Number(p.id) }) }, "Added")) onDone(x!) }}>Add</Button></li>
          ))}</ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------- people paid

function People({ manage }: { manage: boolean }) {
  const { data } = useApi<Payee[]>("/payroll/payees")
  const [editing, setEditing] = useState<Payee | "new" | null>(null)
  const [ending, setEnding] = useState<Payee | null>(null)
  const groups = (["clergy", "employee", "casual", "council"] as const).map((k) => [k, (data ?? []).filter((p) => p.kind === k)] as const).filter(([, l]) => l.length)
  return (
    <>
      <TableCard title="People paid" count={data?.length} actions={manage && <Button onClick={() => setEditing("new")}><UserPlus className="size-4" /> Add someone</Button>}>
        {!data ? <div className="m-6 h-32 animate-pulse rounded-xl bg-muted" /> : data.length === 0 ? (
          <EmptyState icon={Users} title="Nobody on the payroll yet" description="Add the vicar's stipend, staff salaries, casual workers and council members who get allowances." />
        ) : groups.map(([k, list]) => (
          <section key={k}>
            <p className="bg-muted/40 px-6 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{KIND[k]} · {list.length}</p>
            <ul className="divide-y">
              {list.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                  <PassportPhoto url={p.photoUrl} name={p.name} className="w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name} <span className="font-normal text-muted-foreground">· {p.role ?? KIND_ONE[p.kind]}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {BASIS[p.basis]}
                      {p.basis !== "daily" && p.basis !== "sitting" && p.monthly ? ` · ${money(p.monthly)} a month` : ""}
                      {p.sittingRate && (p.basis === "sitting" || p.basis === "both") ? ` · ${money(p.sittingRate)} a sitting` : ""}
                      {p.dailyRate && p.basis === "daily" ? ` · ${money(p.dailyRate)} a day` : ""}
                      {` · ${p.paymentMethod}`}{p.seats.length ? ` · ${p.seats.join(", ")}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">{p.nssf && <Badge variant="info">NSSF</Badge>}{p.paye && <Badge variant="info">PAYE</Badge>}</div>
                  {manage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-8">Change <ChevronDown className="size-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(p)}><Pencil className="size-4" /> Edit pay</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEnding(p)}><UserMinus className="size-4" /> Stop paying</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </TableCard>
      {editing && <PayeeForm payee={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {ending && <EndPayee payee={ending} onClose={() => setEnding(null)} />}
    </>
  )
}

function PayeeForm({ payee, onClose }: { payee: Payee | null; onClose: () => void }) {
  const [v, setV] = useState({
    memberId: payee?.memberId ?? "", name: payee?.name ?? "", kind: payee?.kind ?? "employee", role: payee?.role ?? "", basis: payee?.basis ?? "monthly",
    dailyRate: payee?.dailyRate ? String(payee.dailyRate) : "", sittingRate: payee?.sittingRate ? String(payee.sittingRate) : "",
    nssf: payee?.nssf ?? true, paye: payee?.paye ?? false, paymentMethod: payee?.paymentMethod ?? "Mobile Money", bankName: payee?.bankName ?? "", accountNumber: payee?.accountNumber ?? "",
    mobileNumber: payee?.mobileNumber ?? "", tin: payee?.tin ?? "", nssfNumber: payee?.nssfNumber ?? "", startDate: payee?.startDate ?? today(),
  })
  const [lines, setLines] = useState<PayLineT[]>(payee?.lines ?? [{ kind: "earning", name: "Basic", amount: 0 }])
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV({ ...v, [k]: x })
  const council = v.kind === "council"
  const save = async () => {
    const body = { ...v, memberId: v.memberId ? Number(v.memberId) : null, dailyRate: v.dailyRate ? Number(v.dailyRate) : null, sittingRate: v.sittingRate ? Number(v.sittingRate) : null,
      role: v.role || null, bankName: v.bankName || null, accountNumber: v.accountNumber || null, mobileNumber: v.mobileNumber || null, tin: v.tin || null, nssfNumber: v.nssfNumber || null,
      lines: v.basis === "sitting" || v.basis === "daily" ? lines.filter((l) => l.kind === "deduction" && l.name.trim()) : lines.filter((l) => l.name.trim()) }
    if (await runAction(() => (payee ? patch(`/payroll/payees/${payee.id}`, body) : post("/payroll/payees", body)), payee ? "Pay updated" : "Added to the payroll")) (refresh(), onClose())
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{payee ? `Pay for ${payee.name}` : "Add someone to the payroll"}</DialogTitle><DialogDescription>Their standing pay each month. Changes for one month only are made on that month&apos;s payroll.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {!payee && <div className="space-y-2 sm:col-span-2"><Label htmlFor="pe-m">Member</Label>
            <MemberPicker id="pe-m" name="memberId" freeTextName="name" placeholder="A member, or type a name" onSelect={(m) => setV((x) => ({ ...x, memberId: m?.id ?? "", name: m?.name ?? x.name, mobileNumber: x.mobileNumber || m?.phone || "" }))} /></div>}
          {!payee && !v.memberId && <div className="space-y-2 sm:col-span-2"><Label htmlFor="pe-n">Name (not a member)</Label><Input id="pe-n" value={v.name} onChange={(e) => set("name", e.target.value)} /></div>}
          <div className="space-y-2"><Label htmlFor="pe-k">Paid as</Label>
            <Select value={v.kind} onValueChange={(x) => { if (!x) return; const k = x as Payee["kind"]; setV({ ...v, kind: k, basis: k === "council" ? "sitting" : k === "casual" ? "daily" : "monthly", nssf: k === "employee", paye: k === "employee" && v.paye }) }}>
              <SelectTrigger id="pe-k" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(KIND_ONE) as Payee["kind"][]).map((k) => <SelectItem key={k} value={k}>{KIND_ONE[k]}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="pe-r">Role</Label><Input id="pe-r" value={v.role} onChange={(e) => set("role", e.target.value)} placeholder={council ? "e.g. PCC secretary" : "e.g. Verger, Parish secretary"} /></div>
          <div className="space-y-2"><Label htmlFor="pe-b">How</Label>
            <Select value={v.basis} onValueChange={(x) => x && set("basis", x as Payee["basis"])}><SelectTrigger id="pe-b" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{(council ? (["sitting", "both"] as const) : (["monthly", "daily"] as const)).map((b) => <SelectItem key={b} value={b}>{BASIS[b]}</SelectItem>)}</SelectContent></Select></div>
          {(v.basis === "sitting" || v.basis === "both") && <div className="space-y-2"><Label htmlFor="pe-s">Per sitting ({CURRENCY})</Label><Input id="pe-s" type="number" min={0} value={v.sittingRate} onChange={(e) => set("sittingRate", e.target.value)} /></div>}
          {v.basis === "daily" && <div className="space-y-2"><Label htmlFor="pe-d">Per day ({CURRENCY})</Label><Input id="pe-d" type="number" min={0} value={v.dailyRate} onChange={(e) => set("dailyRate", e.target.value)} /></div>}
        </div>
        <div className="space-y-2">
          <Label>{v.basis === "sitting" || v.basis === "daily" ? "Standing deductions" : v.basis === "both" ? "Fixed monthly allowance and deductions" : "Monthly pay and deductions"}</Label>
          <LinesEditor lines={v.basis === "sitting" || v.basis === "daily" ? lines.filter((l) => l.kind === "deduction") : lines} onChange={setLines} deductionsOnly={v.basis === "sitting" || v.basis === "daily"} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border px-3 py-2"><Label htmlFor="pe-nssf" className="flex flex-col items-start"><span>NSSF</span><span className="text-xs font-normal text-muted-foreground">5% from them, 10% from the church</span></Label><Switch id="pe-nssf" checked={v.nssf} onCheckedChange={(c) => set("nssf", c)} /></div>
          <div className="flex items-center justify-between rounded-xl border px-3 py-2"><Label htmlFor="pe-paye" className="flex flex-col items-start"><span>PAYE</span><span className="text-xs font-normal text-muted-foreground">URA monthly bands (Settings)</span></Label><Switch id="pe-paye" checked={v.paye} onCheckedChange={(c) => set("paye", c)} /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2"><Label htmlFor="pe-pm">Paid by</Label>
            <Select value={v.paymentMethod} onValueChange={(x) => x && set("paymentMethod", x)}><SelectTrigger id="pe-pm" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
          {v.paymentMethod === "Bank Transfer" ? <>
            <div className="space-y-2"><Label htmlFor="pe-bn">Bank</Label><Input id="pe-bn" value={v.bankName} onChange={(e) => set("bankName", e.target.value)} placeholder="e.g. Centenary" /></div>
            <div className="space-y-2"><Label htmlFor="pe-an">Account no.</Label><Input id="pe-an" value={v.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} /></div>
          </> : v.paymentMethod === "Mobile Money" ? <div className="space-y-2 sm:col-span-2"><Label htmlFor="pe-mm">Mobile money number</Label><Input id="pe-mm" value={v.mobileNumber} onChange={(e) => set("mobileNumber", e.target.value)} placeholder="07xx xxx xxx" /></div> : null}
          {(v.nssf || v.paye) && <>
            <div className="space-y-2"><Label htmlFor="pe-tin">TIN</Label><Input id="pe-tin" value={v.tin} onChange={(e) => set("tin", e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="pe-nn">NSSF no.</Label><Input id="pe-nn" value={v.nssfNumber} onChange={(e) => set("nssfNumber", e.target.value)} /></div>
          </>}
          <div className="space-y-2"><Label htmlFor="pe-st">Paid from</Label><Input id="pe-st" type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!v.name.trim() && !v.memberId} onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EndPayee({ payee, onClose }: { payee: Payee; onClose: () => void }) {
  const [d, setD] = useState(today())
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Stop paying {payee.name}</DialogTitle><DialogDescription>They come off future payrolls; their payslips are kept.</DialogDescription></DialogHeader>
        <div className="space-y-2"><Label htmlFor="ep-d">Last day</Label><Input id="ep-d" type="date" value={d} onChange={(e) => setD(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={async () => { if (await runAction(() => post(`/payroll/payees/${payee.id}/end`, { endDate: d }), "Taken off the payroll")) (refresh(), onClose()) }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------- NSSF & PAYE

function Remittances({ manage }: { manage: boolean }) {
  const { data } = useApi<Remittance[]>("/payroll/remittances")
  const [paying, setPaying] = useState<Remittance | null>(null)
  return (
    <TableCard title="NSSF & PAYE" count={data?.length}>
      {!data ? <div className="m-6 h-32 animate-pulse rounded-xl bg-muted" /> : data.length === 0 ? (
        <EmptyState icon={Landmark} title="Nothing owed" description="NSSF and PAYE appear here once a payroll is paid, due by the 15th of the next month." />
      ) : (
        <ul className="divide-y">
          {data.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
              <Badge variant={r.kind === "nssf" ? "info" : "gold"}>{r.kind === "nssf" ? "NSSF" : "PAYE"}</Badge>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.period ? monthName(r.period) : ""} · {money(r.amount)}</p>
                <p className={cn("text-xs", r.overdue ? "text-destructive" : "text-muted-foreground")}>
                  {r.paidOn ? `Remitted ${date(r.paidOn)}${r.reference ? ` · ${r.reference}` : ""}` : `${r.overdue ? "Overdue: was due" : "Due"} ${date(r.dueDate)} to ${r.kind === "nssf" ? "NSSF" : "URA"}`}
                </p>
              </div>
              {r.paidOn ? <Badge variant="success">Remitted</Badge> : manage && <Button size="sm" onClick={() => setPaying(r)}>Record remittance</Button>}
            </li>
          ))}
        </ul>
      )}
      {paying && <RemitForm r={paying} onClose={() => setPaying(null)} />}
    </TableCard>
  )
}

function RemitForm({ r, onClose }: { r: Remittance; onClose: () => void }) {
  const [v, setV] = useState({ date: today(), method: "Bank Transfer", reference: "" })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{r.kind === "nssf" ? "NSSF" : "PAYE"} for {r.period ? monthName(r.period) : ""}</DialogTitle><DialogDescription>{money(r.amount)} sent to {r.kind === "nssf" ? "NSSF" : "URA"}. This clears what is owed in the books.</DialogDescription></DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-2"><Label htmlFor="rm-d">Date</Label><Input id="rm-d" type="date" max={today()} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="rm-m">Paid by</Label><Select value={v.method} onValueChange={(x) => x && setV({ ...v, method: x })}><SelectTrigger id="rm-m" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="rm-r">{r.kind === "nssf" ? "NSSF payment reference" : "URA PRN"}</Label><Input id="rm-r" value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => { if (await runAction(() => post(`/payroll/remittances/${r.id}/remit`, { date: v.date, paymentMethod: v.method, reference: v.reference || null }), "Remittance recorded")) (refresh(), onClose()) }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
