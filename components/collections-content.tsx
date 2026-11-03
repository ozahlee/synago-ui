"use client"

import { useState } from "react"
import { mutate } from "swr"
import { Gift, Plus, HandHeart, Info, PackageCheck, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState, Page, PageHeader, StatCard } from "@/components/page"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { num, runAction, str, useApiForm } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { Attachments } from "@/components/attachments"
import { del, post, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlParam } from "@/lib/use-url-param"
import { CURRENCY, date, money, today } from "@/lib/format"
import { PAYMENT_METHODS, type PersonalCollection } from "@/lib/types"
import { cn } from "@/lib/utils"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/collections") || k.startsWith("/placements")))
const STATUS = { open: { label: "Collecting", variant: "info" }, handed_over: { label: "Handed over", variant: "success" }, closed: { label: "Closed", variant: "muted" } } as const

export function NotChurchMoney({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 rounded-xl border border-info/30 bg-info/5 px-3 py-2 text-sm", className)}>
      <Info className="mt-0.5 size-4 shrink-0 text-info" />
      <span>This money belongs to the person it is collected for. It is recorded with receipts for transparency, but it is <b>not church income</b> and never appears in the church&apos;s books.</span>
    </p>
  )
}

/** Collections members make *for a person*: send-offs, wedding contributions, a family in need. */
export function CollectionsContent() {
  const { can } = useAuth()
  const manage = can("members.manage")
  const { data = [], isLoading } = useApi<PersonalCollection[]>("/collections")
  const [open, setOpen] = useState<string | null>(null)
  useUrlParam("open", setOpen)
  const [creating, setCreating] = useState(false)
  const openOnes = data.filter((c) => c.status === "open")

  return (
    <Page>
      <PageHeader eyebrow="Giving" title="Personal collections" description="When members give toward a person, such as a student's send-off, a couple's wedding or a family in need: who gave, receipts, thank-yous and the hand-over."
        actions={manage && <Button onClick={() => setCreating(true)}><Plus className="size-4" /> New collection</Button>} />
      <NotChurchMoney />
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Collecting now" icon={HandHeart} value={openOnes.length.toLocaleString()} />
        <StatCard label="Given (open collections)" icon={Gift} tone="gold" value={money(openOnes.reduce((s, c) => s + c.given, 0))} hint={`${money(openOnes.reduce((s, c) => s + c.stillPromised, 0))} still promised`} />
        <StatCard label="Handed over" icon={PackageCheck} tone="success" value={data.filter((c) => c.status === "handed_over").length.toLocaleString()} />
      </section>
      {isLoading ? <div className="h-40 animate-pulse rounded-2xl bg-muted" /> : data.length === 0 ? <Card className="py-0"><EmptyState icon={Gift} title="No collections yet" description="Start one for a send-off, a wedding or a member in need." /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => {
            const pct = c.target ? Math.min(100, (c.given / c.target) * 100) : 0
            return (
              <Card key={c.id} className="cursor-pointer gap-0 p-5 transition hover:-translate-y-0.5 hover:border-primary/25" onClick={() => setOpen(c.id)}>
                <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{c.purpose}</h3><Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge></div>
                <p className="text-xs text-muted-foreground">For {c.beneficiary}{c.coordinator ? ` · coordinated by ${c.coordinator}` : ""}</p>
                <p className="mt-3 text-sm"><span className="text-xl font-semibold tabular">{money(c.given)}</span>{c.target ? <span className="text-muted-foreground"> of {money(c.target)}</span> : null}</p>
                {c.target ? <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} /></div> : null}
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3.5" /> {c.givers} giver{c.givers === 1 ? "" : "s"}{c.deadline ? ` · by ${date(c.deadline)}` : ""}</p>
              </Card>
            )
          })}
        </div>
      )}
      {open && <CollectionDialog id={open} manage={manage} onClose={() => setOpen(null)} />}
      {creating && <CollectionForm onClose={() => setCreating(false)} onSaved={setOpen} />}
    </Page>
  )
}

function CollectionDialog({ id, manage, onClose }: { id: string; manage: boolean; onClose: () => void }) {
  const { data: c, mutate: reload } = useApi<PersonalCollection>(`/collections/${id}`)
  const [giving, setGiving] = useState(false)
  const [handing, setHanding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const done = () => (reload(), refresh())
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        {!c ? <><DialogTitle className="sr-only">Loading</DialogTitle><div className="h-60 animate-pulse rounded-xl bg-muted" /></> : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2"><DialogTitle className="text-xl">{c.purpose}</DialogTitle><Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge></div>
              <DialogDescription>For {c.beneficiary}{c.coordinator ? ` · coordinator ${c.coordinator}` : ""}{c.deadline ? ` · collect by ${date(c.deadline)}` : ""}</DialogDescription>
            </DialogHeader>
            <NotChurchMoney />
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Given</p><p className="text-xl font-semibold tabular">{money(c.given)}</p>{c.target ? <p className="text-xs text-muted-foreground">of {money(c.target)}</p> : null}</div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Still promised</p><p className="text-xl font-semibold tabular">{money(c.stillPromised)}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Givers</p><p className="text-xl font-semibold tabular">{c.givers}</p></div>
            </div>
            {c.status === "handed_over" && <p className="rounded-xl bg-success/10 px-3 py-2 text-sm text-success">Handed over on {date(c.handedOverOn)}: {money(c.handedOverAmount)}{c.gift ? `, ${c.gift}` : ""}.</p>}

            <div className="overflow-hidden rounded-xl border">
              {(c.gifts ?? []).length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No gifts recorded yet.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>From</TableHead><TableHead className="text-right">Given</TableHead><TableHead className="text-right">Promised</TableHead><TableHead className="hidden md:table-cell">Receipt</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                  <TableBody>
                    {c.gifts!.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="text-muted-foreground">{date(g.date)}</TableCell>
                        <TableCell className="font-medium">{g.giver}</TableCell>
                        <TableCell className="text-right tabular">{g.amount ? money(g.amount) : "—"}</TableCell>
                        <TableCell className="text-right tabular text-muted-foreground">{g.pledged ? money(g.pledged) : ""}</TableCell>
                        <TableCell className="hidden font-mono text-xs md:table-cell">{g.reference}</TableCell>
                        <TableCell>{manage && c.status === "open" && <Button variant="ghost" size="icon" className="size-8" onClick={() => setRemoving(g.id)} aria-label="Remove"><Trash2 className="size-4" /></Button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <Attachments type="collection" id={c.id} canEdit={manage} hint="Receipt for the gift bought, a photo of the hand-over" suggestions={["Gift receipt", "Hand-over photo"]} />
            <DialogFooter>
              {manage && c.status === "open" && <Button variant="outline" onClick={() => setHanding(true)}><PackageCheck className="size-4" /> Hand over</Button>}
              {manage && c.status === "open" && <Button onClick={() => setGiving(true)}><Plus className="size-4" /> Record a gift</Button>}
            </DialogFooter>
            {giving && <GiveForm c={c} onClose={() => setGiving(false)} onDone={done} />}
            {handing && <HandOverForm c={c} onClose={() => setHanding(false)} onDone={done} />}
            {removing && <ConfirmDialog open onOpenChange={(o) => !o && setRemoving(null)} title="Remove this gift?" description="Its receipt number is cancelled." confirmLabel="Remove"
              onConfirm={async () => { const ok = await runAction(() => del(`/collections/${c.id}/gifts/${removing}`), "Gift removed"); if (ok) done(); return ok }} />}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function GiveForm({ c, onClose, onDone }: { c: PersonalCollection; onClose: () => void; onDone: () => void }) {
  const [method, setMethod] = useState("Cash")
  const [thanks, setThanks] = useState(true)
  const { handleSubmit, pending, error } = useApiForm(async (fd) => {
    const member = str(fd, "memberId")
    await post(`/collections/${c.id}/gifts`, { date: str(fd, "date"), memberId: member ? Number(member) : null, giverName: member ? null : str(fd, "giverName"),
      amount: num(fd, "amount"), pledged: num(fd, "pledged"), paymentMethod: method, sendThanks: thanks })
    onDone()
    onClose()
  }, "Gift recorded")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Record a gift</DialogTitle><DialogDescription>Toward {c.purpose}. Enter what was given now, what was promised, or both.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="gv-m">From</Label><MemberPicker id="gv-m" name="memberId" freeTextName="giverName" placeholder="A member, or type a name (e.g. Mothers' Union)" />{error?.field("giverName") && <p className="text-xs text-destructive">Choose a member or type the giver&apos;s name.</p>}</div>
          <div className="space-y-2"><Label htmlFor="gv-a">Given now ({CURRENCY})</Label><Input id="gv-a" name="amount" type="number" min="0" /></div>
          <div className="space-y-2"><Label htmlFor="gv-p">Promised ({CURRENCY})</Label><Input id="gv-p" name="pledged" type="number" min="0" /></div>
          <div className="space-y-2"><Label htmlFor="gv-d">Date</Label><Input id="gv-d" name="date" type="date" max={today()} defaultValue={today()} required /></div>
          <div className="space-y-2">
            <Label htmlFor="gv-mt">Method</Label>
            <Select value={method} onValueChange={(v) => v && setMethod(v)}><SelectTrigger id="gv-mt" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="flex items-center justify-between rounded-xl border bg-secondary/40 px-4 py-3 sm:col-span-2"><Label htmlFor="gv-t">Send a thank-you SMS with the receipt</Label><Switch id="gv-t" checked={thanks} onCheckedChange={setThanks} /></div>
          {error && !Object.keys(error.errors).length && <p className="text-sm text-destructive sm:col-span-2">{error.message}</p>}
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Record gift"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function HandOverForm({ c, onClose, onDone }: { c: PersonalCollection; onClose: () => void; onDone: () => void }) {
  const { handleSubmit, pending } = useApiForm(async (fd) => {
    await post(`/collections/${c.id}/hand-over`, { date: str(fd, "date"), amount: num(fd, "amount") ?? 0, gift: str(fd, "gift") })
    onDone()
    onClose()
  }, "Handed over")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Hand over to {c.beneficiary}</DialogTitle><DialogDescription>Record what was given: cash, a gift bought with it, or both. The collection then closes.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="ho-d">Date</Label><Input id="ho-d" name="date" type="date" max={today()} defaultValue={today()} required /></div>
            <div className="space-y-2"><Label htmlFor="ho-a">Cash handed over ({CURRENCY})</Label><Input id="ho-a" name="amount" type="number" min="0" defaultValue={c.given} required /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="ho-g">Gift bought / given</Label><Input id="ho-g" name="gift" placeholder="e.g. A Bible, a suitcase and an envelope" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Record hand-over"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CollectionForm({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const { handleSubmit, pending, error } = useApiForm(async (fd) => {
    const coord = str(fd, "coordinatorMemberId")
    const r = await post<{ data: { id: string } }>("/collections", { purpose: str(fd, "purpose"), beneficiary: str(fd, "beneficiary"), relatedType: "other",
      target: num(fd, "target"), deadline: str(fd, "deadline"), coordinatorMemberId: coord ? Number(coord) : null, notes: str(fd, "notes") })
    refresh()
    onClose()
    onSaved(r.data.id)
  }, "Collection started")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New personal collection</DialogTitle><DialogDescription>For a person, not the church. Send-offs for students start from their placement.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="cl-p">What for</Label><Input id="cl-p" name="purpose" required placeholder="e.g. Support for the Okello family" />{error?.field("purpose") && <p className="text-xs text-destructive">{error.field("purpose")}</p>}</div>
          <div className="space-y-2"><Label htmlFor="cl-b">For whom</Label><Input id="cl-b" name="beneficiary" required /></div>
          <div className="space-y-2"><Label htmlFor="cl-t">Target ({CURRENCY})</Label><Input id="cl-t" name="target" type="number" min="0" /></div>
          <div className="space-y-2"><Label htmlFor="cl-c">Coordinator</Label><MemberPicker id="cl-c" name="coordinatorMemberId" /></div>
          <div className="space-y-2"><Label htmlFor="cl-d">Collect by</Label><Input id="cl-d" name="deadline" type="date" /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="cl-n">Notes</Label><Textarea id="cl-n" name="notes" rows={2} /></div>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Start collection"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

