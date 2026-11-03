"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { mutate } from "swr"
import {
  Megaphone, AlertTriangle, CheckCircle2, Circle, Trash2, Plus, HeartHandshake, CalendarPlus, Home, Printer, Gift, Wallet, Clock, ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { runAction } from "@/components/form"
import { NotChurchMoney } from "@/components/collections-content"
import { del, patch, post, put, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useSettings } from "@/lib/settings"
import { CURRENCY, date, lastSunday, longDate, money, today } from "@/lib/format"
import { PAYMENT_METHODS, type Marriage, type WeddingDetail } from "@/lib/types"
import { cn } from "@/lib/utils"

export function useWedding(id: string) {
  const res = useApi<WeddingDetail>(`/marriages/${id}/wedding`)
  const refresh = () => (res.mutate(), mutate((k) => typeof k === "string" && (k.startsWith("/marriages") || k.startsWith("/dashboard") || k.startsWith("/collections"))))
  return { ...res, refresh }
}

function Section({ title, hint, action, children }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h3 className="text-sm font-semibold">{title}</h3>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------- banns

export function BannsTab({ m, w, refresh }: { m: Marriage; w: WeddingDetail; refresh: () => void }) {
  const { can } = useAuth()
  const manage = can("members.manage")
  const { services } = useSettings()
  const lastRead = w.banns.at(-1)?.date ?? null
  const waiting = !!lastRead && lastSunday() <= lastRead // the next Sunday hasn't come yet
  const [v, setV] = useState({ date: lastSunday(), service: services[0] ?? "", readBy: m.officiant ?? "" })
  const [objecting, setObjecting] = useState<string | null>(null)
  const [text, setText] = useState("")
  const open = w.banns.find((b) => b.objection && !b.objectionResolved)
  const read = async () => { if (await runAction(() => post(`/marriages/${m.id}/banns`, { date: v.date, service: v.service || null, readBy: v.readBy || null }), `Banns reading ${w.banns.length + 1} recorded`)) refresh() }
  return (
    <div className="space-y-5">
      <ol className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((n) => {
          const b = w.banns.find((x) => x.number === n)
          return (
            <li key={n} className={cn("rounded-xl border p-3", b ? (b.objection && !b.objectionResolved ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5") : "border-dashed")}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{["First", "Second", "Third"][n - 1]} reading</p>
              {b ? (
                <>
                  <p className="mt-1 font-semibold">{longDate(b.date)}</p>
                  <p className="text-xs text-muted-foreground">{[b.service, b.readBy && `read by ${b.readBy}`].filter(Boolean).join(" · ") || "—"}</p>
                  {b.objection && <p className={cn("mt-2 text-xs", b.objectionResolved ? "text-success" : "text-destructive")}><AlertTriangle className="mr-1 inline size-3" />{b.objectionResolved ? `Objection resolved: ${b.resolution ?? ""}` : `Objection: ${b.objection}`}</p>}
                  {manage && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {!b.objection && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => (setObjecting(b.id), setText(""))}>Record objection</Button>}
                      {b.objection && !b.objectionResolved && <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => (setObjecting(`r:${b.id}`), setText(""))}>Resolve</Button>}
                      {n === w.banns.length && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={async () => { if (await runAction(() => del(`/marriage-banns/${b.id}`), "Reading removed")) refresh() }}><Trash2 className="size-3" /></Button>}
                    </div>
                  )}
                  {objecting === b.id || objecting === `r:${b.id}` ? (
                    <div className="mt-2 space-y-2">
                      <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={objecting.startsWith("r:") ? "How it was resolved" : "What was raised, and by whom"} />
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7" disabled={!text.trim()} onClick={async () => {
                          const body = objecting.startsWith("r:") ? { objectionResolved: true, resolution: text } : { objection: text }
                          if (await runAction(() => patch(`/marriage-banns/${b.id}`, body), objecting.startsWith("r:") ? "Objection resolved" : "Objection recorded")) (setObjecting(null), refresh())
                        }}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => setObjecting(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : <p className="mt-1 text-sm text-muted-foreground">{n === w.banns.length + 1 && w.nextBannsSunday ? `Next: ${longDate(w.nextBannsSunday)}` : "Not yet read"}</p>}
            </li>
          )
        })}
      </ol>
      {open && <p className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" />An objection was raised at reading {w.banns.find((b) => b.id === open.id)?.number}. The banns can&apos;t be read again until it is resolved.</p>}
      {manage && w.banns.length < 3 && !open && m.status === "scheduled" && waiting && (
        <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground"><Megaphone className="mr-1.5 inline size-4" />Reading {w.banns.length + 1} is due on <b className="text-foreground">{longDate(w.nextBannsSunday)}</b>. Record it here after that service.</p>
      )}
      {manage && w.banns.length < 3 && !open && m.status === "scheduled" && !waiting && (
        <div className="grid items-end gap-3 rounded-xl border bg-secondary/40 p-4 sm:grid-cols-4">
          <div className="space-y-1.5"><Label htmlFor="bn-d" className="text-xs">Sunday read</Label><Input id="bn-d" type="date" max={today()} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="bn-s" className="text-xs">Service</Label>
            <Select value={v.service} onValueChange={(x) => x && setV({ ...v, service: x })}><SelectTrigger id="bn-s" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="bn-r" className="text-xs">Read by</Label><Input id="bn-r" value={v.readBy} onChange={(e) => setV({ ...v, readBy: e.target.value })} /></div>
          <Button onClick={read}><Megaphone className="size-4" /> Record reading {w.banns.length + 1}</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild><Link href={`/marriages/certificate?id=${m.id}&doc=banns`} target="_blank"><Printer className="size-4" /> {w.banns.length >= 3 ? "Certificate of banns" : "Banns notice"}</Link></Button>
        <p className="self-center text-xs text-muted-foreground">Weddings still needing banns are listed on the printed Sunday programme.</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- readiness

export function ReadinessTab({ m, w, refresh }: { m: Marriage; w: WeddingDetail; refresh: () => void }) {
  const { can } = useAuth()
  const manage = can("members.manage")
  const [ref, setRef] = useState("")
  const [session, setSession] = useState({ date: today(), counsellor: "", topic: "" })
  return (
    <div className="space-y-6">
      <div className={cn("flex items-center gap-3 rounded-xl px-4 py-3", w.ready ? "bg-success/10 text-success" : "bg-warning/10")}>
        {w.ready ? <ShieldCheck className="size-5" /> : <Clock className="size-5 text-warning" />}
        <p className="text-sm font-medium">{w.ready ? "Everything is ready for the wedding." : `${w.readyCount} of ${w.readiness.length} ready`}</p>
      </div>
      <ul className="divide-y rounded-xl border">
        {w.readiness.map((i) => (
          <li key={i.key} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            {i.done ? <CheckCircle2 className="size-5 shrink-0 text-success" /> : <Circle className="size-5 shrink-0 text-muted-foreground" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{i.label}{i.auto && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">from the registers</span>}</p>
              {i.detail && <p className="text-xs text-muted-foreground">{i.detail}</p>}
            </div>
            {manage && !i.auto && (
              <div className="flex items-center gap-1.5">
                {i.key === "licence" && !i.done && <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Licence no." className="h-8 w-32" />}
                <Button size="sm" variant={i.done ? "ghost" : "outline"} className="h-8" onClick={async () => {
                  if (await runAction(() => post(`/marriages/${m.id}/checklist`, { key: i.key, done: !i.done, ref: ref || null }), i.done ? "Unticked" : "Ticked")) (setRef(""), refresh())
                }}>{i.done ? "Undo" : i.key === "baptism" || i.key === "confirmation" ? "Certificate seen" : "Tick"}</Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <Section title="Counselling sessions" hint="Who met the couple, when and on what">
        {w.counselling.length > 0 && (
          <ul className="divide-y rounded-xl border text-sm">
            {w.counselling.map((c, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2">
                <span className="w-28 shrink-0 text-muted-foreground">{date(c.date)}</span>
                <span className="flex-1">{c.topic ?? "Session"}{c.counsellor && <span className="text-muted-foreground"> · {c.counsellor}</span>}</span>
                {manage && <Button size="icon" variant="ghost" className="size-7" onClick={async () => { if (await runAction(() => del(`/marriages/${m.id}/counselling/${i}`), "Session removed")) refresh() }} aria-label="Remove"><Trash2 className="size-3.5" /></Button>}
              </li>
            ))}
          </ul>
        )}
        {manage && (
          <div className="grid items-end gap-2 sm:grid-cols-[150px_1fr_1fr_auto]">
            <Input type="date" aria-label="Session date" value={session.date} onChange={(e) => setSession({ ...session, date: e.target.value })} />
            <Input aria-label="Counsellor" value={session.counsellor} onChange={(e) => setSession({ ...session, counsellor: e.target.value })} placeholder="Counsellor (e.g. Mothers' Union)" />
            <Input aria-label="Topic" value={session.topic} onChange={(e) => setSession({ ...session, topic: e.target.value })} placeholder="Topic (e.g. Finances)" />
            <Button variant="outline" onClick={async () => { if (await runAction(() => post(`/marriages/${m.id}/counselling`, { ...session, counsellor: session.counsellor || null, topic: session.topic || null }), "Session added")) (setSession({ date: today(), counsellor: "", topic: "" }), refresh()) }}><Plus className="size-4" /> Add</Button>
          </div>
        )}
      </Section>
    </div>
  )
}

// ---------------------------------------------------------------- money

const FEE_ITEMS = ["Wedding fee", "Choir", "Venue / church hall", "Decoration", "Organist", "Certificate"]

export function MoneyTab({ m, w, refresh }: { m: Marriage; w: WeddingDetail; refresh: () => void }) {
  const { can } = useAuth()
  const manage = can("members.manage")
  const finance = can("finance.manage")
  const [fee, setFee] = useState({ item: FEE_ITEMS[0], amount: "" })
  const [method, setMethod] = useState("Mobile Money")
  const [target, setTarget] = useState("")
  return (
    <div className="space-y-6">
      <Section title="Church fees" hint="Paid by the couple to the church. Recorded as church income under Wedding fees.">
        {w.fees.length > 0 && (
          <ul className="divide-y rounded-xl border text-sm">
            {w.fees.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <span className="flex-1 font-medium">{f.item}</span>
                <span className="font-semibold tabular">{money(f.amount)}</span>
                {f.paid ? <Badge variant="success">Paid {date(f.paidOn)}</Badge> : finance ? (
                  <Button size="sm" className="h-7" onClick={async () => { if (await runAction(() => post(`/marriage-fees/${f.id}/pay`, { date: today(), paymentMethod: method }), `${f.item} paid`)) refresh() }}>Mark paid</Button>
                ) : <Badge variant="warning">Unpaid</Badge>}
                {finance && <Button size="icon" variant="ghost" className="size-7" onClick={async () => { if (await runAction(() => del(`/marriage-fees/${f.id}`), f.paid ? "Fee removed and payment reversed" : "Fee removed")) refresh() }} aria-label="Remove"><Trash2 className="size-3.5" /></Button>}
              </li>
            ))}
            <li className="flex justify-between px-3 py-2 font-semibold"><span>Total</span><span className="tabular">{money(w.feesPaid)} paid of {money(w.feesTotal)}</span></li>
          </ul>
        )}
        {manage && (
          <div className="flex flex-wrap items-end gap-2">
            <Input aria-label="Fee item" list="fee-items" value={fee.item} onChange={(e) => setFee({ ...fee, item: e.target.value })} className="w-48" />
            <datalist id="fee-items">{FEE_ITEMS.map((x) => <option key={x} value={x} />)}</datalist>
            <Input aria-label={`Amount (${CURRENCY})`} type="number" min="1" value={fee.amount} onChange={(e) => setFee({ ...fee, amount: e.target.value })} placeholder={`Amount (${CURRENCY})`} className="w-36" />
            <Button variant="outline" disabled={!fee.amount} onClick={async () => { if (await runAction(() => post(`/marriages/${m.id}/fees`, { item: fee.item, amount: Number(fee.amount) }), "Fee added")) (setFee({ item: FEE_ITEMS[0], amount: "" }), refresh()) }}><Plus className="size-4" /> Add fee</Button>
            {finance && w.fees.some((f) => !f.paid) && (
              <Select value={method} onValueChange={(x) => x && setMethod(x)}><SelectTrigger className="w-40" aria-label="Paid by"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
            )}
          </div>
        )}
      </Section>

      <Section title="Contributions to the couple" hint="Members, cells and the wedding committee giving toward the wedding">
        <NotChurchMoney />
        {w.collection ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4">
            <p className="text-sm"><Gift className="mr-1 inline size-4 text-gold" /><b className="tabular">{money(w.collection.given)}</b>{w.collection.target ? <span className="text-muted-foreground"> of {money(w.collection.target)}</span> : ""} given</p>
            <Button size="sm" variant="outline" asChild><Link href={`/collections?open=${w.collection.id}`}>Record gifts & promises →</Link></Button>
          </div>
        ) : manage && (
          <div className="flex flex-wrap items-end gap-2">
            <Input aria-label="Target" type="number" min="0" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={`Target (${CURRENCY}, optional)`} className="w-52" />
            <Button onClick={async () => { if (await runAction(() => post(`/marriages/${m.id}/collection`, { target: target ? Number(target) : null }), "Wedding collection started")) refresh() }}><HeartHandshake className="size-4" /> Start wedding collection</Button>
          </div>
        )}
      </Section>
    </div>
  )
}

// ---------------------------------------------------------------- the day

const STARTER = [
  { time: "", item: "Guests seated", who: "Ushers" }, { time: "", item: "Processional", who: "Choir" }, { time: "", item: "Welcome and opening prayer", who: "" },
  { time: "", item: "Readings", who: "" }, { time: "", item: "Sermon", who: "" }, { time: "", item: "Vows and rings", who: "" },
  { time: "", item: "Signing of the register", who: "" }, { time: "", item: "Blessing and recessional", who: "" }, { time: "", item: "Photos", who: "" },
]

export function DayTab({ m, w, refresh }: { m: Marriage; w: WeddingDetail; refresh: () => void }) {
  const { can } = useAuth()
  const manage = can("members.manage")
  const [time, setTime] = useState(w.time ?? "11:00")
  const [items, setItems] = useState(w.programme.length ? w.programme.map((x) => ({ time: x.time ?? "", item: x.item, who: x.who ?? "" })) : STARTER)
  const set = (i: number, k: "time" | "item" | "who", val: string) => setItems(items.map((x, j) => (j === i ? { ...x, [k]: val } : x)))
  const save = () => runAction(() => put(`/marriages/${m.id}/programme`, { time, items: items.filter((x) => x.item.trim()).map((x) => ({ time: x.time || null, item: x.item, who: x.who || null })) }), "Programme saved").then((ok) => ok && refresh())
  return (
    <div className="space-y-6">
      <Section title="Order of the day" hint="The order of service for guests, and a run sheet for the officiant and ushers"
        action={<div className="flex gap-2">
          <Button size="sm" variant="outline" asChild><Link href={`/marriages/certificate?id=${m.id}&doc=programme`} target="_blank"><Printer className="size-4" /> Order of service</Link></Button>
          <Button size="sm" variant="outline" asChild><Link href={`/marriages/certificate?id=${m.id}&doc=runsheet`} target="_blank"><Printer className="size-4" /> Run sheet</Link></Button>
        </div>}>
        <div className="flex items-end gap-3">
          <div className="space-y-1.5"><Label htmlFor="dy-t" className="text-xs">Service starts</Label><Input id="dy-t" type="time" value={time} disabled={!manage} onChange={(e) => setTime(e.target.value)} className="w-32" /></div>
        </div>
        <div className="space-y-2">
          {items.map((x, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[110px_1fr_1fr_36px]">
              <Input type="time" aria-label="Time" value={x.time} disabled={!manage} onChange={(e) => set(i, "time", e.target.value)} />
              <Input aria-label="Item" value={x.item} disabled={!manage} onChange={(e) => set(i, "item", e.target.value)} />
              <Input aria-label="Who" value={x.who} disabled={!manage} onChange={(e) => set(i, "who", e.target.value)} placeholder="Who" />
              {manage && <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-4" /></Button>}
            </div>
          ))}
        </div>
        {manage && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setItems([...items, { time: "", item: "", who: "" }])}><Plus className="size-4" /> Add item</Button><Button size="sm" onClick={save}>Save programme</Button></div>}
      </Section>

      <Section title="Calendar & venue" hint={`Books ${m.place || "the church"} on ${longDate(m.date)} so nothing else is planned there`}>
        <div className="flex flex-wrap items-center gap-2">
          {manage && <Button variant={w.eventId ? "outline" : "default"} onClick={async () => {
            try {
              const r = await post<{ data: WeddingDetail }>(`/marriages/${m.id}/calendar`)
              toast.success(w.eventId ? "Calendar updated" : "Added to the calendar")
              if (r.data.clashes?.length) toast.warning(`Also at ${m.place || "the venue"} that day: ${r.data.clashes.map((c) => `${c.title} (${c.start})`).join(", ")}`)
              refresh()
            } catch (e) { toast.error(e instanceof Error ? e.message : "Could not add to the calendar") }
          }}><CalendarPlus className="size-4" /> {w.eventId ? "Update the calendar" : "Add to the calendar"}</Button>}
          {w.eventId && <Button variant="ghost" asChild><Link href={`/calendar`}>Open the calendar →</Link></Button>}
        </div>
      </Section>

      <Section title="After the wedding" hint="The couple become a family in the Families register; a greeting goes out on each anniversary if that reminder is on">
        {w.household ? (
          <p className="flex items-center gap-2 text-sm"><Home className="size-4 text-primary" /> Family: <Link href={`/households?open=${w.household.id}`} className="font-medium hover:underline">{w.household.name}</Link></p>
        ) : manage && (
          w.bothMembers
            ? <Button variant="outline" onClick={async () => { if (await runAction(() => post(`/marriages/${m.id}/family`), "Family created in the register")) refresh() }}><Home className="size-4" /> Make them a family in the register</Button>
            : <p className="text-sm text-muted-foreground">Both partners need to be members to form a family in the register.</p>
        )}
        <p className="text-xs text-muted-foreground"><Wallet className="mr-1 inline size-3" />Turn on <Link href="/reminders" className="text-primary hover:underline">Wedding anniversaries</Link> under Reminders to send the couple a greeting each year.</p>
      </Section>
    </div>
  )
}
