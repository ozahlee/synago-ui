"use client"

import { useState } from "react"
import { mutate } from "swr"
import { Ban, CheckCircle2, ClipboardList, Clock, Pencil, Plus, ShoppingCart, Trash2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState, Page, PageHeader, TableCard } from "@/components/page"
import { Attachments } from "@/components/attachments"
import { runAction } from "@/components/form"
import { api, post, put, qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlParam } from "@/lib/use-url-param"
import { CURRENCY, date, money, today } from "@/lib/format"
import { PAYMENT_METHODS, TRANSACTION_CATEGORIES, type Ministry, type Project, type Requisition, type RequisitionRow, type RequisitionStatus, type SaleItem } from "@/lib/types"
import { cn } from "@/lib/utils"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/requisitions") || k.startsWith("/dashboard") || k.startsWith("/sale")))

export const REQ_STATUS: Record<RequisitionStatus, { label: string; variant: "info" | "warning" | "success" | "muted" | "danger" | "gold" }> = {
  pending: { label: "With the treasurer", variant: "info" },
  awaiting_senior: { label: "With the vicar", variant: "warning" },
  approved: { label: "Approved, to buy", variant: "gold" },
  paid: { label: "Bought", variant: "success" },
  rejected: { label: "Not approved", variant: "danger" },
  cancelled: { label: "Withdrawn", variant: "muted" },
}
const TABS = [
  { key: "waiting", label: "Waiting on me" },
  { key: "open", label: "Open" },
  { key: "mine", label: "Mine" },
  { key: "all", label: "All" },
] as const

/** Purchase requisitions: ask → treasurer approves → the vicar too above the threshold → bought. */
export function RequisitionsContent() {
  const { can } = useAuth()
  const approver = can("finance.manage") || can("requisitions.approve")
  const seesAll = approver || can("finance.view")
  const [tab, setTab] = useState<string>(approver ? "waiting" : "mine")
  const [status, setStatus] = useState<string | null>(null)
  useUrlParam("status", (s) => (setStatus(s), setTab(approver ? "waiting" : "all")))
  useUrlParam("tab", setTab)
  const [open, setOpen] = useState<string | null>(null)
  useUrlParam("open", setOpen)
  const [editing, setEditing] = useState<Requisition | "new" | null>(null)
  const { data } = useApi<RequisitionRow[]>(qs("/requisitions", { mine: tab === "mine" ? 1 : undefined, status: tab === "open" ? "open" : status ?? undefined, perPage: 100 }))
  const rows = (data ?? []).filter((r) => tab !== "waiting" || r.waitingOnMe)

  return (
    <Page>
      <PageHeader eyebrow="Finance" title="Requisitions" description="Ask for something to be bought. The treasurer approves it, and the vicar too for larger amounts; then it is bought and goes into the books."
        actions={can("requisitions.request") && <Button onClick={() => setEditing("new")}><Plus className="size-4" /> New requisition</Button>} />

      <TableCard title="Requisitions" count={rows.length} actions={
        <Tabs value={tab} onValueChange={(v) => (setTab(v), setStatus(null))}>
          <TabsList>{TABS.filter((t) => seesAll || t.key === "mine" || t.key === "all").filter((t) => approver || t.key !== "waiting").map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}</TabsList>
        </Tabs>}>
        {!data ? <div className="m-6 h-40 animate-pulse rounded-xl bg-muted" /> : rows.length === 0 ? (
          <EmptyState icon={ClipboardList} title={tab === "waiting" ? "Nothing waiting on you" : "No requisitions here"} description={tab === "waiting" ? "Requisitions to approve or buy will show here." : "Bulbs, tools, stationery: ask for what is needed with a new requisition."} />
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Requisition</TableHead><TableHead className="hidden md:table-cell">Asked by</TableHead><TableHead className="hidden lg:table-cell">Needed by</TableHead>
              <TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpen(r.id)}>
                  <TableCell>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-mono">{r.number}</span> · {r.category}{r.ministry ? ` · ${r.ministry.name}` : ""}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{r.mine ? "You" : r.requestedBy}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{r.neededBy ? date(r.neededBy) : "—"}</TableCell>
                  <TableCell className="text-right font-semibold tabular">{money(r.paidAmount ?? r.total)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={REQ_STATUS[r.status].variant}>{REQ_STATUS[r.status].label}</Badge>
                      {r.waitingOnMe && <Badge variant="outline">Your turn</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>

      {open && <RequisitionDialog id={open} onClose={() => setOpen(null)} onEdit={(r) => (setOpen(null), setEditing(r))} />}
      {editing && <RequisitionForm record={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={(id) => (setEditing(null), setOpen(id))} />}
    </Page>
  )
}

type Line = { description: string; quantity: string; unit: string; unitCost: string }
const blank = (): Line => ({ description: "", quantity: "1", unit: "", unitCost: "" })

function RequisitionForm({ record, onClose, onSaved }: { record: Requisition | null; onClose: () => void; onSaved: (id: string) => void }) {
  const { can } = useAuth()
  const { data: ministries = [] } = useApi<Ministry[]>(can("members.view") ? "/ministries" : null)
  const { data: projects = [] } = useApi<Project[]>(can("finance.view") ? "/projects?open=1" : null)
  const { data: settings } = useApi<{ requisitionSeniorThreshold?: number }>("/settings")
  const [v, setV] = useState({
    title: record?.title ?? "", purpose: record?.purpose ?? "", category: record?.category ?? "Supplies",
    ministryId: record?.ministry?.id ?? "", projectId: record?.project?.id ?? "", neededBy: record?.neededBy ?? "",
  })
  const [lines, setLines] = useState<Line[]>(record ? record.items.map((i) => ({ description: i.description, quantity: String(i.quantity), unit: i.unit ?? "", unitCost: String(i.unitCost) })) : [blank()])
  const [pending, setPending] = useState(false)
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0)
  const threshold = settings?.requisitionSeniorThreshold ?? 500000
  const set = (i: number, k: keyof Line, val: string) => setLines(lines.map((l, j) => (j === i ? { ...l, [k]: val } : l)))

  const save = async () => {
    setPending(true)
    const body = {
      title: v.title, purpose: v.purpose || null, category: v.category, ministryId: v.ministryId ? Number(v.ministryId) : null,
      projectId: v.projectId ? Number(v.projectId) : null, neededBy: v.neededBy || null,
      items: lines.filter((l) => l.description.trim()).map((l) => ({ description: l.description, quantity: Number(l.quantity) || 1, unit: l.unit || null, unitCost: Number(l.unitCost) || 0 })),
    }
    let id: string | null = null
    const ok = await runAction(async () => {
      const r = record ? await put<{ data: Requisition }>(`/requisitions/${record.id}`, body) : await post<{ data: Requisition }>("/requisitions", body)
      id = r.data.id
    }, record ? "Requisition updated" : "Requisition sent to the treasurer")
    setPending(false)
    if (ok && id) (refresh(), onSaved(id))
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{record ? "Change requisition" : "New requisition"}</DialogTitle>
          <DialogDescription>What is needed, roughly what it costs, and why. You can attach a quote once it is saved.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="rq-t">What for</Label><Input id="rq-t" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="e.g. Bulbs for the church hall" /></div>
          <div className="space-y-2">
            <Label htmlFor="rq-c">Kind of spending</Label>
            <Select value={v.category} onValueChange={(x) => x && setV({ ...v, category: x })}><SelectTrigger id="rq-c" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{TRANSACTION_CATEGORIES.expense.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-2"><Label htmlFor="rq-n">Needed by</Label><Input id="rq-n" type="date" min={today()} value={v.neededBy} onChange={(e) => setV({ ...v, neededBy: e.target.value })} /></div>
          {ministries.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="rq-m">For a ministry</Label>
              <Select value={v.ministryId || "none"} onValueChange={(x) => x && setV({ ...v, ministryId: x === "none" ? "" : x })}><SelectTrigger id="rq-m" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">The whole church</SelectItem>{ministries.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
            </div>
          )}
          {projects.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="rq-p">Paid from a project</Label>
              <Select value={v.projectId || "none"} onValueChange={(x) => x && setV({ ...v, projectId: x === "none" ? "" : x })}><SelectTrigger id="rq-p" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">General fund</SelectItem>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Items</Label>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1.4fr_32px] gap-2 border-b pb-2 last:border-0 sm:grid-cols-[1fr_70px_70px_110px_32px] sm:border-0 sm:pb-0">
                <Input aria-label="Item" className="col-span-4 sm:col-span-1" value={l.description} onChange={(e) => set(i, "description", e.target.value)} placeholder="Item" />
                <Input aria-label="Quantity" type="number" min="0" step="any" value={l.quantity} onChange={(e) => set(i, "quantity", e.target.value)} />
                <Input aria-label="Unit" value={l.unit} onChange={(e) => set(i, "unit", e.target.value)} placeholder="pcs" />
                <Input aria-label={`Unit cost (${CURRENCY})`} type="number" min="0" value={l.unitCost} onChange={(e) => set(i, "unitCost", e.target.value)} placeholder="Each" />
                <Button type="button" size="icon" variant="ghost" className="size-9" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setLines([...lines, blank()])}><Plus className="size-4" /> Add item</Button>
            <p className="text-sm">Total <b className="tabular">{money(total)}</b></p>
          </div>
          {total >= threshold && <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs">{money(threshold)} or more: the vicar approves this as well as the treasurer.</p>}
        </div>
        <div className="space-y-2"><Label htmlFor="rq-w">Why it is needed</Label><Textarea id="rq-w" rows={2} value={v.purpose} onChange={(e) => setV({ ...v, purpose: e.target.value })} placeholder="Optional: helps the approvers decide" /></div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pending || !v.title.trim() || !lines.some((l) => l.description.trim())} onClick={save}>{pending ? "Saving…" : record ? "Save changes" : "Send for approval"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RequisitionDialog({ id, onClose, onEdit }: { id: string; onClose: () => void; onEdit: (r: Requisition) => void }) {
  const { can } = useAuth()
  const { data: r, mutate: reload } = useApi<Requisition>(`/requisitions/${id}`)
  const [deciding, setDeciding] = useState<"approved" | "rejected" | null>(null)
  const [note, setNote] = useState("")
  const [paying, setPaying] = useState(false)
  const done = () => (reload(), refresh())
  const decide = async () => {
    if (await runAction(() => post(`/requisitions/${id}/decide`, { decision: deciding, note: note || null }), deciding === "approved" ? "Approved" : "Not approved: the requester has been told")) {
      setDeciding(null); setNote(""); done()
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {!r ? <><DialogTitle className="sr-only">Loading</DialogTitle><div className="h-60 animate-pulse rounded-xl bg-muted" /></> : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2"><DialogTitle className="text-xl">{r.title}</DialogTitle><Badge variant={REQ_STATUS[r.status].variant}>{REQ_STATUS[r.status].label}</Badge></div>
              <DialogDescription>
                <span className="font-mono">{r.number}</span> · {r.category}{r.ministry ? ` · ${r.ministry.name}` : ""}{r.project ? ` · from ${r.project.name}` : ""} · asked by {r.mine ? "you" : r.requestedBy} on {date(r.createdAt.slice(0, 10))}
                {r.neededBy ? ` · needed by ${date(r.neededBy)}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Each</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.items.map((i) => (
                    <TableRow key={i.id}><TableCell>{i.description}</TableCell><TableCell className="text-right tabular">{i.quantity}{i.unit ? ` ${i.unit}` : ""}</TableCell>
                      <TableCell className="text-right tabular">{money(i.unitCost)}</TableCell><TableCell className="text-right font-medium tabular">{money(i.amount)}</TableCell></TableRow>
                  ))}
                  <TableRow><TableCell colSpan={3} className="font-semibold">Total</TableCell><TableCell className="text-right font-semibold tabular">{money(r.total)}</TableCell></TableRow>
                </TableBody>
              </Table>
            </div>
            {r.purpose && <p className="whitespace-pre-line rounded-xl bg-muted px-3 py-2 text-sm">{r.purpose}</p>}

            {r.budget && r.status !== "paid" && (
              <p className={cn("rounded-xl px-3 py-2 text-sm", r.budget.after < 0 ? "bg-destructive/10 text-destructive" : "bg-secondary")}>
                {r.category} budget this month: {money(r.budget.allocated)}, {money(r.budget.spent)} spent.{" "}
                {r.budget.after < 0 ? <b>This would go {money(-r.budget.after)} over.</b> : <>This leaves {money(r.budget.after)}.</>}
              </p>
            )}

            <ol className="space-y-2 text-sm">
              <Step done label="Asked" who={r.mine ? "You" : r.requestedBy} at={r.createdAt} />
              {(["treasurer", ...(r.needsSenior ? ["senior"] : [])] as const).map((stage) => {
                const a = r.approvals.find((x) => x.stage === stage)
                const name = stage === "treasurer" ? "Treasurer" : "Vicar"
                return a ? <Step key={stage} done={a.decision === "approved"} rejected={a.decision === "rejected"} label={`${name} ${a.decision === "approved" ? "approved" : "did not approve"}`} who={a.by} at={a.at} note={a.note} />
                  : <Step key={stage} label={`${name}'s approval`} who={r.status === "rejected" || r.status === "cancelled" ? null : "waiting"} />
              })}
              {r.payment ? <Step done label={`Bought for ${money(r.payment.amount)}${r.payment.supplier ? ` from ${r.payment.supplier}` : ""}`} who={r.payment.by} at={r.payment.date}
                note={r.payment.variance ? `${r.payment.variance > 0 ? "+" : ""}${money(r.payment.variance)} against the estimate` : null} />
                : r.status !== "rejected" && r.status !== "cancelled" && <Step label="Bought" who={r.status === "approved" ? "waiting" : null} />}
              {r.needsSenior === false && r.status === "pending" && <li className="pl-7 text-xs text-muted-foreground">Under {money(r.threshold)}: the treasurer&apos;s approval is enough.</li>}
            </ol>

            {deciding && (
              <div className="space-y-2 rounded-xl border bg-secondary/40 p-3">
                <Label htmlFor="rq-note">{deciding === "rejected" ? "Why not? The requester will see this." : "Note (optional)"}</Label>
                <Textarea id="rq-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" variant={deciding === "rejected" ? "destructive" : "default"} disabled={deciding === "rejected" && !note.trim()} onClick={decide}>{deciding === "approved" ? "Approve" : "Don't approve"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeciding(null)}>Cancel</Button>
                </div>
              </div>
            )}

            <Attachments type="requisition" id={r.id} canEdit={r.status !== "cancelled" && (r.mine || can("finance.manage"))} title="Quotes & receipts"
              hint="A quote from the supplier, then the receipt once it is bought" suggestions={["Quotation", "Receipt", "Delivery note"]} />

            <DialogFooter className="flex-wrap gap-2">
              {r.can.cancel && <Button variant="ghost" onClick={async () => { if (await runAction(() => post(`/requisitions/${id}/cancel`), "Requisition withdrawn")) done() }}><Ban className="size-4" /> Withdraw</Button>}
              {r.can.edit && <Button variant="outline" onClick={() => onEdit(r)}><Pencil className="size-4" /> Change</Button>}
              {r.can.approve && !deciding && <>
                <Button variant="outline" onClick={() => setDeciding("rejected")}><XCircle className="size-4" /> Don&apos;t approve</Button>
                <Button onClick={() => setDeciding("approved")}><CheckCircle2 className="size-4" /> Approve{r.can.stage === "senior" ? " as vicar" : ""}</Button>
              </>}
              {r.can.pay && <Button onClick={() => setPaying(true)}><ShoppingCart className="size-4" /> Record the purchase</Button>}
            </DialogFooter>
            {paying && <PayForm r={r} onClose={() => setPaying(false)} onDone={done} />}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Step({ done, rejected, label, who, at, note }: { done?: boolean; rejected?: boolean; label: string; who?: string | null; at?: string | null; note?: string | null }) {
  const Icon = rejected ? XCircle : done ? CheckCircle2 : Clock
  return (
    <li className="flex gap-2">
      <Icon className={cn("mt-0.5 size-5 shrink-0", rejected ? "text-destructive" : done ? "text-success" : "text-muted-foreground")} />
      <div>
        <p className={cn(!done && !rejected && "text-muted-foreground")}>{label}{who && who !== "waiting" ? <span className="text-muted-foreground"> · {who}</span> : null}{who === "waiting" ? <span className="text-muted-foreground"> · waiting</span> : null}{at ? <span className="text-muted-foreground"> · {date(at.slice(0, 10))}</span> : null}</p>
        {note && <p className="text-xs italic text-muted-foreground">{note}</p>}
      </div>
    </li>
  )
}

function PayForm({ r, onClose, onDone }: { r: Requisition; onClose: () => void; onDone: () => void }) {
  const { can } = useAuth()
  const { data: items = [] } = useApi<SaleItem[]>(can("sales.manage") && r.category === "Merchandise stock" ? "/sale-items?kind=merchandise" : null)
  const [v, setV] = useState({ date: today(), amount: String(r.total), method: "Cash", supplier: "", itemId: "", qty: "" })
  const [pending, setPending] = useState(false)
  const save = async () => {
    setPending(true)
    const ok = await runAction(() => api(`/requisitions/${r.id}/pay`, { method: "POST", body: {
      date: v.date, amount: Number(v.amount), paymentMethod: v.method, supplier: v.supplier || null,
      saleItemId: v.itemId ? Number(v.itemId) : null, stockQuantity: v.itemId ? Number(v.qty) : null,
    } }), "Purchase recorded in the books")
    setPending(false)
    if (ok) (onDone(), onClose())
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Record the purchase</DialogTitle><DialogDescription>What was actually paid. It goes into the books under {r.category}{r.project ? `, from ${r.project.name}` : ""}.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="rp-a">Paid ({CURRENCY})</Label><Input id="rp-a" type="number" min="1" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="rp-d">Date</Label><Input id="rp-d" type="date" max={today()} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></div>
          <div className="space-y-2">
            <Label htmlFor="rp-m">Paid by</Label>
            <Select value={v.method} onValueChange={(x) => x && setV({ ...v, method: x })}><SelectTrigger id="rp-m" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-2"><Label htmlFor="rp-s">Supplier</Label><Input id="rp-s" value={v.supplier} onChange={(e) => setV({ ...v, supplier: e.target.value })} placeholder="Optional" /></div>
          {items.length > 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="rp-i">Add to stock of</Label>
                <Select value={v.itemId || "none"} onValueChange={(x) => x && setV({ ...v, itemId: x === "none" ? "" : x })}><SelectTrigger id="rp-i" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Not for sale</SelectItem>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select>
              </div>
              {v.itemId && <div className="space-y-2"><Label htmlFor="rp-q">How many</Label><Input id="rp-q" type="number" min="1" value={v.qty} onChange={(e) => setV({ ...v, qty: e.target.value })} /></div>}
            </>
          )}
        </div>
        {Number(v.amount) > r.total * 1.1 && <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs">That is {Math.round(((Number(v.amount) - r.total) / r.total) * 100)}% more than approved. Attach the receipt so the approvers can see why.</p>}
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending || !Number(v.amount) || (!!v.itemId && !Number(v.qty))} onClick={save}>{pending ? "Saving…" : "Record purchase"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
