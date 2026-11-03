"use client"

import { useRef, useState } from "react"
import { mutate } from "swr"
import { Archive, Gavel, MessageSquareText, Package, PackagePlus, ShoppingBag, Trash2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState, Page, PageHeader, StatCard, TableCard } from "@/components/page"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { MemberPicker } from "@/components/member-picker"
import { PeriodFilter, periodParams } from "@/components/period-filter"
import { runAction, str } from "@/components/form"
import { del, patch, post, qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { usePeriod } from "@/lib/period"
import { useUrlParam } from "@/lib/use-url-param"
import { CURRENCY, date, money, today } from "@/lib/format"
import { PAYMENT_METHODS, type Ministry, type Project, type Sale, type SaleItem, type SalesSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/sale") || k.startsWith("/dashboard")))
const qty = (n: number | null) => (n === null ? "—" : Number.isInteger(n) ? String(n) : n.toFixed(2))

/** Items & sales: ministry and church merchandise, and gifts in kind turned into money (harvest auctions included). */
export function SalesContent() {
  const { can } = useAuth()
  const manage = can("sales.manage")
  const [tab, setTab] = useState("items")
  useUrlParam("tab", setTab)
  const period = usePeriod("this_year")
  const { data: summary } = useApi<SalesSummary>(qs("/sales/summary", periodParams(period)))
  const [selling, setSelling] = useState<SaleItem | true | null>(null)
  const [adding, setAdding] = useState<"merchandise" | "in_kind" | null>(null)

  return (
    <Page>
      <PageHeader eyebrow="Finance" title="Items & sales" description="Things the church or a ministry sells, and gifts in kind (a goat, sugar, chickens) turned into money, including harvest auctions where the buyer pays later."
        actions={manage && <>
          <Button variant="outline" onClick={() => setAdding("in_kind")}><Gavel className="size-4" /> Gift in kind</Button>
          <Button variant="outline" onClick={() => setAdding("merchandise")}><PackagePlus className="size-4" /> Item to sell</Button>
          <Button onClick={() => setSelling(true)}><ShoppingBag className="size-4" /> Record a sale</Button>
        </>} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodFilter period={period} />
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sold" icon={ShoppingBag} value={summary && money(summary.sold)} hint="In this period" />
        <StatCard label="Received" icon={Wallet} tone="success" value={summary && money(summary.collected)} hint="Recorded as church income" />
        <StatCard label="Still owed" icon={Gavel} tone="gold" value={summary && money(summary.owed)} hint="Pay-later buyers, all time" />
        <StatCard label="Gifts in kind realised" icon={Package} tone="info" value={summary && money(summary.inKind.realised)}
          hint={summary && summary.inKind.estimated > 0 ? `against an estimate of ${money(summary.inKind.estimated)}` : "Sold gifts in kind"} />
      </section>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="owing">Owing</TabsTrigger>
          <TabsTrigger value="summary">By seller & item</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "items" && <ItemsTab manage={manage} onSell={(i) => setSelling(i)} />}
      {tab === "sales" && <SalesTab manage={manage} params={periodParams(period)} />}
      {tab === "owing" && <SalesTab manage={manage} params={{ status: "owing" }} owing />}
      {tab === "summary" && summary && <SummaryTab s={summary} />}

      {selling && <SaleForm item={selling === true ? null : selling} events={summary?.events ?? []} onClose={() => setSelling(null)} />}
      {adding && <ItemForm kind={adding} onClose={() => setAdding(null)} />}
    </Page>
  )
}

function ItemsTab({ manage, onSell }: { manage: boolean; onSell: (i: SaleItem) => void }) {
  const [kind, setKind] = useState("all")
  const { data } = useApi<SaleItem[]>(qs("/sale-items", { kind }))
  const [stocking, setStocking] = useState<SaleItem | null>(null)
  const [removing, setRemoving] = useState<SaleItem | null>(null)
  return (
    <TableCard title="Items" count={data?.length} actions={
      <Select value={kind} onValueChange={(v) => v && setKind(v)}><SelectTrigger size="sm" className="h-9 w-44" aria-label="Kind"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">Everything</SelectItem><SelectItem value="merchandise">Merchandise</SelectItem><SelectItem value="in_kind">Gifts in kind</SelectItem></SelectContent></Select>}>
      {!data ? <div className="m-6 h-40 animate-pulse rounded-xl bg-muted" /> : data.length === 0 ? (
        <EmptyState icon={Package} title="Nothing for sale yet" description="Add T-shirts, calendars or books a ministry sells, or a gift in kind to be sold or auctioned." />
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Item</TableHead><TableHead className="hidden md:table-cell">Sold by</TableHead><TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">In stock</TableHead><TableHead className="hidden text-right lg:table-cell">Received</TableHead><TableHead className="hidden text-right lg:table-cell">Profit</TableHead><TableHead className="w-0" />
          </TableRow></TableHeader>
          <TableBody>
            {data.map((i) => (
              <TableRow key={i.id} className={cn(i.status === "sold_out" && "opacity-70")}>
                <TableCell>
                  <p className="flex items-center gap-2 font-medium">{i.name}{i.kind === "in_kind" && <Badge variant="gold">Gift in kind</Badge>}{i.status === "sold_out" && <Badge variant="muted">Sold out</Badge>}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.kind === "in_kind" ? [i.donor && `from ${i.donor}`, i.receivedOn && date(i.receivedOn), i.estimatedValue && `worth about ${money(i.estimatedValue)}`].filter(Boolean).join(" · ")
                      : [i.project && `for ${i.project.name}`, i.sold ? `${qty(i.sold)} sold` : null].filter(Boolean).join(" · ") || " "}
                  </p>
                </TableCell>
                <TableCell className="hidden md:table-cell">{i.ministry?.name ?? "The church"}</TableCell>
                <TableCell className="text-right tabular">{i.price !== null ? money(i.price) : "—"}</TableCell>
                <TableCell className="text-right tabular">{qty(i.stock)}{i.unit && i.stock !== null ? ` ${i.unit}` : ""}</TableCell>
                <TableCell className="hidden text-right tabular lg:table-cell">{money(i.collected)}{i.owed > 0 && <span className="block text-xs text-muted-foreground">{money(i.owed)} owed</span>}</TableCell>
                <TableCell className={cn("hidden text-right tabular lg:table-cell", (i.profit ?? 0) < 0 && "text-muted-foreground")}>{i.profit === null ? "—" : money(i.profit)}</TableCell>
                <TableCell>
                  {manage && (
                    <div className="flex justify-end gap-1">
                      {i.status !== "sold_out" && <Button size="sm" variant="outline" className="h-8" onClick={() => onSell(i)}>Sell</Button>}
                      {i.kind === "merchandise" && <Button size="sm" variant="ghost" className="h-8" onClick={() => setStocking(i)} aria-label="Stock"><PackagePlus className="size-4" /></Button>}
                      {i.sold > 0
                        ? <Button size="sm" variant="ghost" className="h-8" onClick={async () => { if (await runAction(() => patch(`/sale-items/${i.id}`, { status: "archived" }), "Archived")) refresh() }} aria-label="Archive"><Archive className="size-4" /></Button>
                        : <Button size="sm" variant="ghost" className="h-8" onClick={() => setRemoving(i)} aria-label="Remove"><Trash2 className="size-4" /></Button>}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {stocking && <StockForm item={stocking} onClose={() => setStocking(null)} />}
      {removing && <ConfirmDialog open onOpenChange={(o) => !o && setRemoving(null)} title={`Remove ${removing.name}?`} description="Any stock purchase recorded with it is taken out of the books too." confirmLabel="Remove"
        onConfirm={async () => { const ok = await runAction(() => del(`/sale-items/${removing.id}`), "Item removed"); if (ok) refresh(); return ok }} />}
    </TableCard>
  )
}

function SalesTab({ manage, params, owing }: { manage: boolean; params: Record<string, string | null | undefined>; owing?: boolean }) {
  const { data } = useApi<Sale[]>(qs("/sales", params))
  const [paying, setPaying] = useState<Sale | null>(null)
  const [removing, setRemoving] = useState<Sale | null>(null)
  return (
    <TableCard title={owing ? "Still owed" : "Sales"} count={data?.length}>
      {!data ? <div className="m-6 h-40 animate-pulse rounded-xl bg-muted" /> : data.length === 0 ? (
        <EmptyState icon={owing ? Wallet : ShoppingBag} title={owing ? "Nobody owes anything" : "No sales in this period"} description={owing ? "Pay-later buyers show here until they have paid." : "Record a sale from the Items tab or the button above."} />
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Item</TableHead><TableHead>Buyer</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">{owing ? "Owed" : "Paid"}</TableHead><TableHead className="w-0" />
          </TableRow></TableHeader>
          <TableBody>
            {data.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="text-muted-foreground">{date(s.date)}</TableCell>
                <TableCell><p className="font-medium">{s.item.name}{s.quantity !== 1 ? ` × ${qty(s.quantity)}` : ""}</p><p className="text-xs text-muted-foreground">{[s.item.seller, s.event].filter(Boolean).join(" · ")}</p></TableCell>
                <TableCell>{s.buyer}{s.owed > 0 && s.dueDate && <p className={cn("text-xs", s.overdue ? "text-destructive" : "text-muted-foreground")}>{s.overdue ? "Was due" : "Due"} {date(s.dueDate)}</p>}</TableCell>
                <TableCell className="text-right tabular">{money(s.total)}</TableCell>
                <TableCell className="text-right font-medium tabular">{owing ? money(s.owed) : <>{money(s.paid)}{s.owed > 0 && <span className="block text-xs font-normal text-muted-foreground">{money(s.owed)} owed</span>}</>}</TableCell>
                <TableCell>
                  {manage && (
                    <div className="flex justify-end gap-1">
                      {s.owed > 0 && <Button size="sm" variant="outline" className="h-8" onClick={() => setPaying(s)}>Paid</Button>}
                      {s.owed > 0 && s.buyerPhone && <Button size="sm" variant="ghost" className="h-8" aria-label="Send a reminder" title="Send a reminder SMS"
                        onClick={() => runAction(() => post(`/sales/${s.id}/remind`), `Reminder sent to ${s.buyer}`)}><MessageSquareText className="size-4" /></Button>}
                      {!owing && <Button size="sm" variant="ghost" className="h-8" onClick={() => setRemoving(s)} aria-label="Undo sale"><Trash2 className="size-4" /></Button>}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {paying && <PaymentForm sale={paying} onClose={() => setPaying(null)} />}
      {removing && <ConfirmDialog open onOpenChange={(o) => !o && setRemoving(null)} title="Undo this sale?" description="The money comes out of the books and the stock goes back." confirmLabel="Undo sale"
        onConfirm={async () => { const ok = await runAction(() => del(`/sales/${removing.id}`), "Sale undone"); if (ok) refresh(); return ok }} />}
    </TableCard>
  )
}

function SummaryTab({ s }: { s: SalesSummary }) {
  const block = (title: string, rows: SalesSummary["bySeller"]) => (
    <Card className="gap-0 overflow-hidden py-0">
      <h3 className="border-b px-5 py-3 font-semibold">{title}</h3>
      {rows.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No sales in this period.</p> : (
        <Table>
          <TableHeader><TableRow><TableHead /><TableHead className="text-right">Sold</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Owed</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map((r) => <TableRow key={r.label}><TableCell className="font-medium">{r.label}<span className="block text-xs text-muted-foreground">{r.count} sale{r.count === 1 ? "" : "s"}</span></TableCell>
            <TableCell className="text-right tabular">{money(r.sold)}</TableCell><TableCell className="text-right tabular">{money(r.collected)}</TableCell><TableCell className="text-right tabular text-muted-foreground">{r.owed ? money(r.owed) : "—"}</TableCell></TableRow>)}</TableBody>
        </Table>
      )}
    </Card>
  )
  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-2">{block("By who sells", s.bySeller)}{block("By item", s.byItem)}</div>
      {s.stockCost > 0 && <p className="text-sm text-muted-foreground">Stock bought in this period: {money(s.stockCost)}, recorded as an expense under Cost of goods for sale.</p>}
    </div>
  )
}

function ItemForm({ kind, onClose }: { kind: "merchandise" | "in_kind"; onClose: () => void }) {
  const { can } = useAuth()
  const { data: ministries = [] } = useApi<Ministry[]>(can("members.view") ? "/ministries" : null)
  const { data: projects = [] } = useApi<Project[]>(can("finance.view") ? "/projects?open=1" : null)
  const inKind = kind === "in_kind"
  const [v, setV] = useState({ name: "", ministryId: "", projectId: "", price: "", unit: inKind ? "" : "each", quantity: inKind ? "1" : "", cost: "", method: "Cash", receivedOn: today(), estimatedValue: "" })
  const [pending, setPending] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const save = async () => {
    const fd = new FormData(form.current ?? undefined)
    const donorMemberId = str(fd, "donorMemberId")
    setPending(true)
    const ok = await runAction(() => post("/sale-items", {
      name: v.name, kind, ministryId: v.ministryId ? Number(v.ministryId) : null, projectId: v.projectId ? Number(v.projectId) : null,
      price: v.price ? Number(v.price) : null, unit: v.unit || null, quantity: v.quantity ? Number(v.quantity) : null,
      cost: !inKind && v.cost ? Number(v.cost) : null, paymentMethod: !inKind && v.cost ? v.method : null,
      donorMemberId: donorMemberId ? Number(donorMemberId) : null, donorName: donorMemberId ? null : str(fd, "donorName"),
      receivedOn: v.receivedOn || null, estimatedValue: v.estimatedValue ? Number(v.estimatedValue) : null,
    }), inKind ? "Gift in kind recorded" : "Item added")
    setPending(false)
    if (ok) (refresh(), onClose())
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{inKind ? "A gift in kind to sell" : "An item to sell"}</DialogTitle>
          <DialogDescription>{inKind ? "A goat, chickens, sugar, matooke… given to the church, to be sold or auctioned. It becomes income when the money comes in." : "T-shirts, calendars, books: bought in by the church or a ministry and sold. What the stock cost goes into the books as an expense."}</DialogDescription>
        </DialogHeader>
        <form ref={form} onSubmit={(e) => e.preventDefault()} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="it-n">Name</Label><Input id="it-n" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder={inKind ? "e.g. Goat" : "e.g. Youth T-shirt"} /></div>
          {inKind ? (
            <>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="it-d">Given by</Label>
                <MemberPicker id="it-d" name="donorMemberId" freeTextName="donorName" placeholder="A member, or type a name" />
              </div>
              <div className="space-y-2"><Label htmlFor="it-q">Quantity</Label><Input id="it-q" type="number" min="0" step="any" value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="it-u">Unit</Label><Input id="it-u" value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })} placeholder="e.g. kg, bunch" /></div>
              <div className="space-y-2"><Label htmlFor="it-e">Worth about ({CURRENCY})</Label><Input id="it-e" type="number" min="0" value={v.estimatedValue} onChange={(e) => setV({ ...v, estimatedValue: e.target.value })} placeholder="Optional" /></div>
              <div className="space-y-2"><Label htmlFor="it-r">Received</Label><Input id="it-r" type="date" max={today()} value={v.receivedOn} onChange={(e) => setV({ ...v, receivedOn: e.target.value })} /></div>
            </>
          ) : (
            <>
              <div className="space-y-2"><Label htmlFor="it-p">Selling price ({CURRENCY})</Label><Input id="it-p" type="number" min="0" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="it-u2">Unit</Label><Input id="it-u2" value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="it-q2">Stock in hand</Label><Input id="it-q2" type="number" min="0" value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} placeholder="Leave blank not to count" /></div>
              <div className="space-y-2"><Label htmlFor="it-c">It cost ({CURRENCY})</Label><Input id="it-c" type="number" min="0" value={v.cost} onChange={(e) => setV({ ...v, cost: e.target.value })} placeholder="Optional" /></div>
              {v.cost && (
                <div className="space-y-2"><Label htmlFor="it-m">Paid by</Label>
                  <Select value={v.method} onValueChange={(x) => x && setV({ ...v, method: x })}><SelectTrigger id="it-m" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                </div>
              )}
            </>
          )}
          {ministries.length > 0 && (
            <div className="space-y-2"><Label htmlFor="it-mi">Sold by</Label>
              <Select value={v.ministryId || "none"} onValueChange={(x) => x && setV({ ...v, ministryId: x === "none" ? "" : x })}><SelectTrigger id="it-mi" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">The church</SelectItem>{ministries.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
            </div>
          )}
          {projects.length > 0 && (
            <div className="space-y-2"><Label htmlFor="it-pr">Money goes to</Label>
              <Select value={v.projectId || "none"} onValueChange={(x) => x && setV({ ...v, projectId: x === "none" ? "" : x })}><SelectTrigger id="it-pr" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">General fund</SelectItem>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
            </div>
          )}
        </form>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending || !v.name.trim()} onClick={save}>{pending ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SaleForm({ item, events, onClose }: { item: SaleItem | null; events: string[]; onClose: () => void }) {
  const { data: items = [] } = useApi<SaleItem[]>(item ? null : "/sale-items")
  const available = items.filter((i) => i.status === "available")
  const [itemId, setItemId] = useState(item?.id ?? "")
  const current = item ?? items.find((i) => i.id === itemId) ?? null
  const form = useRef<HTMLFormElement>(null)
  const [v, setV] = useState({ date: today(), quantity: "1", price: item?.price ? String(item.price) : "", paidNow: "", method: "Cash", buyerPhone: "", dueDate: "",
    auction: item?.kind === "in_kind", event: events[0] ?? `Harvest ${new Date().getFullYear()}` })
  const [payLater, setPayLater] = useState(false)
  const [pending, setPending] = useState(false)
  const [key, setKey] = useState(0)
  const total = (Number(v.quantity) || 0) * (Number(v.price) || 0)
  const paid = payLater ? Number(v.paidNow) || 0 : total

  const save = async (another: boolean) => {
    if (!current) return
    const fd = new FormData(form.current ?? undefined)
    const buyerMemberId = str(fd, "buyerMemberId")
    setPending(true)
    const ok = await runAction(() => post("/sales", {
      itemId: Number(current.id), date: v.date, quantity: Number(v.quantity), unitPrice: Number(v.price),
      buyerMemberId: buyerMemberId ? Number(buyerMemberId) : null, buyerName: buyerMemberId ? null : str(fd, "buyerName"), buyerPhone: v.buyerPhone || null,
      occasion: v.auction ? "harvest" : null, event: v.auction ? v.event : null,
      paidNow: paid, paymentMethod: paid > 0 ? v.method : null, dueDate: payLater ? v.dueDate || null : null,
    }), payLater && paid < total ? `Sold: ${money(total - paid)} to come` : "Sale recorded")
    setPending(false)
    if (!ok) return
    refresh()
    if (another) {
      // auction mode: same occasion and date, next lot
      setItemId(""); setV({ ...v, quantity: "1", price: "", paidNow: "", buyerPhone: "", dueDate: "" }); setPayLater(false); setKey((k) => k + 1)
    } else onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Record a sale</DialogTitle><DialogDescription>What was sold, to whom, and what was paid. Money received goes into the books straight away.</DialogDescription></DialogHeader>
        <form ref={form} key={key} onSubmit={(e) => e.preventDefault()} className="grid gap-4 sm:grid-cols-2">
          {!item && (
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="sl-i">Item</Label>
              <Select value={itemId} onValueChange={(x) => { if (!x) return; setItemId(x); const it = items.find((i) => i.id === x); setV((s) => ({ ...s, price: it?.price ? String(it.price) : s.price, auction: it?.kind === "in_kind" ? true : s.auction })) }}>
                <SelectTrigger id="sl-i" className="w-full"><SelectValue placeholder="Choose what was sold" /></SelectTrigger>
                <SelectContent>{available.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}{i.stock !== null ? ` (${qty(i.stock)} left)` : ""}</SelectItem>)}</SelectContent></Select>
              {items.length > 0 && available.length === 0 && <p className="text-xs text-muted-foreground">Everything is sold out. Add stock or a new item first.</p>}
            </div>
          )}
          {item && <p className="text-sm sm:col-span-2"><b>{item.name}</b>{item.stock !== null ? <span className="text-muted-foreground"> · {qty(item.stock)} left</span> : null}</p>}
          <div className="space-y-2"><Label htmlFor="sl-q">Quantity</Label><Input id="sl-q" type="number" min="0" step="any" max={current?.stock ?? undefined} value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="sl-p">{v.auction ? "Winning bid" : "Price each"} ({CURRENCY})</Label><Input id="sl-p" type="number" min="0" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="sl-b">Buyer</Label>
            <MemberPicker id="sl-b" name="buyerMemberId" freeTextName="buyerName" placeholder="A member, or type a name (optional for cash)"
              onSelect={(m) => setV((s) => ({ ...s, buyerPhone: m?.phone ?? s.buyerPhone }))} />
          </div>
          <div className="flex items-center justify-between rounded-xl border bg-secondary/40 px-4 py-3 sm:col-span-2">
            <Label htmlFor="sl-a" className="flex flex-col items-start gap-0.5"><span>Harvest auction</span><span className="text-xs font-normal text-muted-foreground">Counts as harvest income</span></Label>
            <Switch id="sl-a" checked={v.auction} onCheckedChange={(c) => setV({ ...v, auction: c })} />
          </div>
          {v.auction && <div className="space-y-2 sm:col-span-2"><Label htmlFor="sl-e">Occasion</Label><Input id="sl-e" list="sl-events" value={v.event} onChange={(e) => setV({ ...v, event: e.target.value })} /><datalist id="sl-events">{events.map((e) => <option key={e} value={e} />)}</datalist></div>}
          <div className="flex items-center justify-between rounded-xl border bg-secondary/40 px-4 py-3 sm:col-span-2">
            <Label htmlFor="sl-l" className="flex flex-col items-start gap-0.5"><span>Paying later</span><span className="text-xs font-normal text-muted-foreground">Part or all of it is promised</span></Label>
            <Switch id="sl-l" checked={payLater} onCheckedChange={setPayLater} />
          </div>
          {payLater && <>
            <div className="space-y-2"><Label htmlFor="sl-n">Paid now ({CURRENCY})</Label><Input id="sl-n" type="number" min="0" max={total} value={v.paidNow} onChange={(e) => setV({ ...v, paidNow: e.target.value })} placeholder="0" /></div>
            <div className="space-y-2"><Label htmlFor="sl-dd">Rest promised by</Label><Input id="sl-dd" type="date" min={today()} value={v.dueDate} onChange={(e) => setV({ ...v, dueDate: e.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="sl-ph">Buyer&apos;s phone (for a reminder)</Label><Input id="sl-ph" value={v.buyerPhone} onChange={(e) => setV({ ...v, buyerPhone: e.target.value })} /></div>
          </>}
          {paid > 0 && (
            <div className="space-y-2"><Label htmlFor="sl-m">Paid by</Label>
              <Select value={v.method} onValueChange={(x) => x && setV({ ...v, method: x })}><SelectTrigger id="sl-m" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
            </div>
          )}
          <div className="space-y-2"><Label htmlFor="sl-d">Date</Label><Input id="sl-d" type="date" max={today()} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></div>
        </form>
        <p className="rounded-xl bg-secondary px-3 py-2 text-sm">Total <b className="tabular">{money(total)}</b>{payLater && <> · paid now {money(paid)} · <b>{money(Math.max(0, total - paid))}</b> to come</>}</p>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {v.auction && !item && <Button variant="outline" disabled={pending || !current || !total} onClick={() => save(true)}>Save & next lot</Button>}
          <Button disabled={pending || !current || !total || (payLater && paid < total && !v.dueDate)} onClick={() => save(false)}>{pending ? "Saving…" : "Record sale"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PaymentForm({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const [v, setV] = useState({ amount: String(sale.owed), date: today(), method: "Cash" })
  const [pending, setPending] = useState(false)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Payment from {sale.buyer}</DialogTitle><DialogDescription>{sale.item.name}: {money(sale.owed)} still owed.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="sp-a">Amount ({CURRENCY})</Label><Input id="sp-a" type="number" min="1" max={sale.owed} value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="sp-d">Date</Label><Input id="sp-d" type="date" max={today()} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="sp-m">Paid by</Label>
            <Select value={v.method} onValueChange={(x) => x && setV({ ...v, method: x })}><SelectTrigger id="sp-m" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pending || !Number(v.amount)} onClick={async () => { setPending(true); const ok = await runAction(() => post(`/sales/${sale.id}/payments`, { amount: Number(v.amount), date: v.date, paymentMethod: v.method }), "Payment recorded"); setPending(false); if (ok) (refresh(), onClose()) }}>Record payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StockForm({ item, onClose }: { item: SaleItem; onClose: () => void }) {
  const [v, setV] = useState({ quantity: "", cost: "", method: "Cash", date: today(), note: "", out: false })
  const [pending, setPending] = useState(false)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Stock: {item.name}</DialogTitle><DialogDescription>{qty(item.stock)} in hand. Add a new batch, or take some out (damaged, given away, a recount).</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border px-3 py-2 sm:col-span-2"><Label htmlFor="st-o">Taking stock out</Label><Switch id="st-o" checked={v.out} onCheckedChange={(c) => setV({ ...v, out: c })} /></div>
          <div className="space-y-2"><Label htmlFor="st-q">How many</Label><Input id="st-q" type="number" min="1" value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="st-d">Date</Label><Input id="st-d" type="date" max={today()} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></div>
          {!v.out && <div className="space-y-2"><Label htmlFor="st-c">It cost ({CURRENCY})</Label><Input id="st-c" type="number" min="0" value={v.cost} onChange={(e) => setV({ ...v, cost: e.target.value })} placeholder="Optional" /></div>}
          {!v.out && v.cost && <div className="space-y-2"><Label htmlFor="st-m">Paid by</Label>
            <Select value={v.method} onValueChange={(x) => x && setV({ ...v, method: x })}><SelectTrigger id="st-m" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>}
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="st-n">Note</Label><Input id="st-n" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder={v.out ? "e.g. Two were damaged" : "e.g. Second batch"} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pending || !Number(v.quantity)} onClick={async () => {
            setPending(true)
            const ok = await runAction(() => post(`/sale-items/${item.id}/stock`, { quantity: (v.out ? -1 : 1) * Number(v.quantity), cost: !v.out && v.cost ? Number(v.cost) : null,
              paymentMethod: !v.out && v.cost ? v.method : null, date: v.date, note: v.note || null }), "Stock updated")
            setPending(false)
            if (ok) (refresh(), onClose())
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

