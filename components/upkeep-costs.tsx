"use client"

import { useState } from "react"
import { toast } from "sonner"
import { BedDouble, Utensils, Bus, HandCoins, Wallet, Smartphone, Gift, Receipt, Plus, Trash2, HeartHandshake } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { runAction } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { ApiError, del, post, qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { CURRENCY, date, money, today } from "@/lib/format"
import { PAYMENT_METHODS, UPKEEP_CATEGORIES, type UpkeepCategory, type UpkeepLine, type UpkeepSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

const CAT: Record<UpkeepCategory, { label: string; icon: typeof Receipt }> = {
  accommodation: { label: "Accommodation", icon: BedDouble }, meals: { label: "Meals", icon: Utensils }, transport: { label: "Transport", icon: Bus },
  honorarium: { label: "Honorarium / facilitation", icon: HandCoins }, allowance: { label: "Allowance / stipend", icon: Wallet },
  airtime: { label: "Airtime / data", icon: Smartphone }, gift: { label: "Gift", icon: Gift }, other: { label: "Other", icon: Receipt },
}
const STATE = { paid: { label: "Paid", variant: "success" }, in_kind: { label: "In kind", variant: "gold" }, planned: { label: "Budgeted", variant: "outline" } } as const

/**
 * The cost of hosting a guest or keeping a student: what was budgeted, what the church paid (posted to the
 * books) and what members gave in kind (a room, meals), by category, plus a student's allowance owed.
 */
export function UpkeepCosts({ subjectType, subjectId, person }: { subjectType: "invitation" | "placement"; subjectId: string; person: string }) {
  const { can } = useAuth()
  const manage = can("members.manage")
  const finance = can("finance.manage")
  const key = qs("/upkeep", { subjectType, subjectId })
  const { data, mutate } = useApi<UpkeepSummary>(key)
  const [adding, setAdding] = useState(false)
  const [paying, setPaying] = useState<UpkeepLine | "allowance" | null>(null)
  const [removing, setRemoving] = useState<UpkeepLine | null>(null)
  const [showAllowances, setShowAllowances] = useState(false)
  if (!data) return <div className="h-32 animate-pulse rounded-xl bg-muted" />
  const t = data.totals
  const a = data.allowance
  // weekly allowances make a long list: fold the paid ones into one row
  const paidAllowances = data.lines.filter((l) => l.category === "allowance" && l.state === "paid")

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Receipt className="size-4" /> Costs</h3>
          <p className="text-xs text-muted-foreground">Church payments go to Accounts ({subjectType === "invitation" ? "Guest ministers" : "Placements"}); what members provide is recorded at its value, off the books.</p>
        </div>
        {manage && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="size-4" /> Add cost</Button>}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fig label="Budgeted" value={money(t.budget)} />
        <Fig label="Church paid" value={money(t.paid)} />
        <Fig label="Given in kind" value={money(t.inKind)} tone="gold" />
        <Fig label="Total cost" value={money(t.total)} strong hint={t.budget ? `${Math.round((t.paid / Math.max(t.budget, 1)) * 100)}% of budget paid` : undefined} />
      </div>

      {a && (
        <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm", a.owed > 0 ? "bg-warning/10" : "bg-success/10")}>
          <span><Wallet className="mr-1 inline size-4" />Allowance {money(a.amount)} {a.frequency === "weekly" ? "a week" : "a month"} · {a.periods} {a.frequency === "weekly" ? "weeks" : "months"} so far: due <b className="tabular">{money(a.due)}</b>, paid <b className="tabular">{money(a.paid)}</b>{a.owed > 0 ? <> · <b className="text-warning">{money(a.owed)} owed</b> to {person.split(" ")[0]}</> : " · up to date"}</span>
          {finance && a.owed > 0 && <Button size="sm" onClick={() => setPaying("allowance")}>Pay what&apos;s due</Button>}
        </div>
      )}

      {data.lines.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {paidAllowances.length > 1 && (
            <li className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <Wallet className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">Allowance payments <span className="font-normal text-muted-foreground">· {paidAllowances.length} payments, last {date(paidAllowances[paidAllowances.length - 1].date)}</span></p>
              </div>
              <span className="font-semibold tabular">{money(paidAllowances.reduce((s, l) => s + (l.amount ?? 0), 0))}</span>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => setShowAllowances(!showAllowances)}>{showAllowances ? "Hide" : "Show each"}</Button>
            </li>
          )}
          {data.lines.filter((l) => showAllowances || paidAllowances.length < 2 || !paidAllowances.includes(l)).map((l) => {
            const C = CAT[l.category]
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <C.icon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{C.label}{l.description && l.description !== C.label ? <span className="font-normal text-muted-foreground"> · {l.description}</span> : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.providedBy === "member" ? <><HeartHandshake className="mr-0.5 inline size-3" />Provided by {l.member}</> : l.member ? `Reimbursed to ${l.member}` : "Church"}
                    {l.date ? ` · ${date(l.date)}` : ""}{l.paymentMethod ? ` · ${l.paymentMethod}` : ""}{l.budget !== null && l.state !== "planned" ? ` · budget ${money(l.budget)}` : ""}
                  </p>
                </div>
                <span className="text-right font-semibold tabular">{money(l.state === "planned" ? l.budget : l.amount)}</span>
                <Badge variant={STATE[l.state].variant}>{STATE[l.state].label}</Badge>
                {finance && l.state === "planned" && <Button size="sm" variant="outline" className="h-7" onClick={() => setPaying(l)}>Pay</Button>}
                {manage && (l.state !== "paid" || finance) && <Button size="icon" variant="ghost" className="size-7" onClick={() => setRemoving(l)} aria-label="Remove"><Trash2 className="size-3.5" /></Button>}
              </li>
            )
          })}
        </ul>
      )}
      {data.lines.length === 0 && !a && <p className="text-sm text-muted-foreground">No costs yet. Add the budget (transport, meals, accommodation…) and record each one as it&apos;s paid or provided.</p>}

      {adding && <AddCost subjectType={subjectType} subjectId={subjectId} canPay={finance} onClose={() => setAdding(false)} onDone={() => mutate()} />}
      {paying && <PayCost subjectType={subjectType} subjectId={subjectId} line={paying === "allowance" ? null : paying} owed={a?.owed ?? 0} onClose={() => setPaying(null)} onDone={() => mutate()} />}
      {removing && <ConfirmDialog open onOpenChange={(o) => !o && setRemoving(null)} title={`Remove this ${CAT[removing.category].label.toLowerCase()} cost?`} confirmLabel="Remove"
        description={removing.state === "paid" ? "The payment is reversed: its expense is removed from Accounts." : "It is removed from the costs."}
        onConfirm={async () => { const ok = await runAction(() => del(`/upkeep/${removing.id}`), "Cost removed"); if (ok) mutate(); return ok }} />}
    </section>
  )
}

function Fig({ label, value, tone, strong, hint }: { label: string; value: string; tone?: "gold"; strong?: boolean; hint?: string }) {
  return (
    <div className={cn("rounded-lg border p-2.5", tone === "gold" && "border-gold/30 bg-gold/5")}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("tabular", strong ? "text-lg font-semibold" : "font-semibold")}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function AddCost({ subjectType, subjectId, canPay, onClose, onDone }: { subjectType: string; subjectId: string; canPay: boolean; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ category: "transport" as UpkeepCategory, description: "", providedBy: "church" as "church" | "member", budget: "", amount: "", payNow: false, method: "Cash", date: today() })
  const [member, setMember] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await post("/upkeep", { subjectType, subjectId: Number(subjectId), category: v.category, description: v.description || null, providedBy: v.providedBy,
        memberId: member ? Number(member) : null, budget: v.budget ? Number(v.budget) : null, amount: v.amount ? Number(v.amount) : null,
        payNow: v.providedBy === "church" && v.payNow, paymentMethod: v.method, date: v.providedBy === "member" || v.payNow ? v.date : null })
      toast.success(v.providedBy === "member" ? "Recorded with thanks" : v.payNow ? "Paid and recorded in Accounts" : "Added to the budget")
      onDone()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err : null)
    } finally {
      setPending(false)
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add a cost</DialogTitle><DialogDescription>Budget it now and pay later, pay it now, or record what a member provided.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="uc-c">What</Label>
            <Select value={v.category} onValueChange={(x) => x && setV({ ...v, category: x as UpkeepCategory })}>
              <SelectTrigger id="uc-c" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{UPKEEP_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CAT[c].label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="uc-d">Detail</Label><Input id="uc-d" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} placeholder="e.g. Bus Lira–Kampala, 2 nights" /></div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Covered by</Label>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant={v.providedBy === "church" ? "default" : "outline"} onClick={() => setV({ ...v, providedBy: "church" })}>The church</Button>
              <Button type="button" size="sm" variant={v.providedBy === "member" ? "default" : "outline"} onClick={() => setV({ ...v, providedBy: "member" })}>A member, in kind</Button>
            </div>
          </div>
          {v.providedBy === "member" ? (
            <>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="uc-m">Member</Label><MemberPicker id="uc-m" name="memberId" onSelect={(m) => setMember(m?.id ?? null)} />{error?.field("memberId") && <p className="text-xs text-destructive">{error.field("memberId")}</p>}</div>
              <div className="space-y-2"><Label htmlFor="uc-v">Estimated value ({CURRENCY})</Label><Input id="uc-v" type="number" min="0" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} required /></div>
              <div className="space-y-2"><Label htmlFor="uc-dt">Date</Label><Input id="uc-dt" type="date" max={today()} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></div>
            </>
          ) : (
            <>
              <div className="space-y-2"><Label htmlFor="uc-b">Budget ({CURRENCY})</Label><Input id="uc-b" type="number" min="0" value={v.budget} onChange={(e) => setV({ ...v, budget: e.target.value })} /></div>
              {canPay && <div className="flex items-end gap-2 pb-2"><Switch id="uc-pn" checked={v.payNow} onCheckedChange={(c) => setV({ ...v, payNow: c, amount: c ? v.amount || v.budget : v.amount })} /><Label htmlFor="uc-pn">Paid now</Label></div>}
              {v.payNow && (
                <>
                  <div className="space-y-2"><Label htmlFor="uc-a">Amount paid ({CURRENCY})</Label><Input id="uc-a" type="number" min="1" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} required /></div>
                  <div className="space-y-2">
                    <Label htmlFor="uc-pm">Paid by</Label>
                    <Select value={v.method} onValueChange={(x) => x && setV({ ...v, method: x })}><SelectTrigger id="uc-pm" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-2"><Label htmlFor="uc-pd">Date</Label><Input id="uc-pd" type="date" max={today()} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></div>
                </>
              )}
            </>
          )}
          {error && !Object.keys(error.errors).length && <p className="text-sm text-destructive sm:col-span-2">{error.message}</p>}
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PayCost({ subjectType, subjectId, line, owed, onClose, onDone }: { subjectType: string; subjectId: string; line: UpkeepLine | null; owed: number; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ amount: String(line ? (line.budget ?? "") : owed), date: today(), method: "Mobile Money" })
  const [member, setMember] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
    const ok = await runAction(() => line
      ? post(`/upkeep/${line.id}/pay`, { amount: Number(v.amount), date: v.date, paymentMethod: v.method, memberId: member ? Number(member) : null })
      : post(`/placements/${subjectId}/allowance`, { amount: Number(v.amount), date: v.date, paymentMethod: v.method }), "Paid and recorded in Accounts")
    setPending(false)
    if (ok) (onDone(), onClose())
  }
  void subjectType
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{line ? `Pay ${CAT[line.category].label.toLowerCase()}` : "Pay the allowance due"}</DialogTitle><DialogDescription>Recorded as an expense in Accounts.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="pc-a">Amount ({CURRENCY})</Label><Input id="pc-a" type="number" min="1" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} required /></div>
          <div className="space-y-2"><Label htmlFor="pc-d">Date</Label><Input id="pc-d" type="date" max={today()} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></div>
          <div className="space-y-2">
            <Label htmlFor="pc-m">Paid by</Label>
            <Select value={v.method} onValueChange={(x) => x && setV({ ...v, method: x })}><SelectTrigger id="pc-m" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
          </div>
          {line && <div className="space-y-2"><Label htmlFor="pc-r">Reimbursing a member who paid? (optional)</Label><MemberPicker id="pc-r" name="memberId" onSelect={(m) => setMember(m?.id ?? null)} /></div>}
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Paying…" : "Pay"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
