"use client"

import Link from "next/link"
import { useState } from "react"
import { mutate } from "swr"
import useSWR from "swr"
import {
  Mic2, Plus, CalendarCheck, MessageSquareText, Wallet, HeartHandshake, CheckCircle2, XCircle, Pencil, Phone, GraduationCap,
  School, Star, Printer, Gift, Trash2, MoreHorizontal, ThumbsUp, ThumbsDown, Clock, Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, PersonAvatar, StatCard } from "@/components/page"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { runAction, useApiForm, str, num } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { Attachments } from "@/components/attachments"
import { api, del, patch, post, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useSettings } from "@/lib/settings"
import { useUrlParam } from "@/lib/use-url-param"
import { CURRENCY, date, humanize, longDate, money, today } from "@/lib/format"
import {
  GUEST_TITLES, INVITATION_PURPOSES, PAYMENT_METHODS, type GuestDetail, type GuestIndex, type GuestInvitation, type GuestMinister, type InvitationStatus,
  type Placement, type PlacementStats,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { UpkeepCosts } from "@/components/upkeep-costs"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/guests") || k.startsWith("/placements") || k.startsWith("/collections") || k.startsWith("/sermons") || k.startsWith("/dashboard")))
const STATUS: Record<InvitationStatus, { label: string; variant: "outline" | "info" | "success" | "muted" | "danger" }> = {
  invited: { label: "Invited", variant: "outline" }, confirmed: { label: "Confirmed", variant: "info" }, completed: { label: "Ministered", variant: "success" },
  declined: { label: "Declined", variant: "muted" }, cancelled: { label: "Cancelled", variant: "muted" },
}

export function GuestsContent() {
  const [tab, setTab] = useState("guests")
  useUrlParam("tab", (t) => (t === "guests" || t === "placements") && setTab(t))
  return (
    <Page>
      <PageHeader eyebrow="People" title="Guests & placements" description="Guest ministers invited to serve (from invitation to thank-you), and students on teaching practice or ministry placement." />
      <Tabs value={tab} onValueChange={setTab} className="gap-5">
        <TabsList>
          <TabsTrigger value="guests"><Mic2 className="size-4" /> Guest ministers</TabsTrigger>
          <TabsTrigger value="placements"><GraduationCap className="size-4" /> Placements</TabsTrigger>
        </TabsList>
        <TabsContent value="guests" className="space-y-6"><Guests /></TabsContent>
        <TabsContent value="placements" className="space-y-6"><Placements /></TabsContent>
      </Tabs>
    </Page>
  )
}

// ================================================================ guest ministers

function Guests() {
  const { can } = useAuth()
  const manage = can("members.manage")
  const { data } = useApi<GuestIndex>("/guests")
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<GuestMinister | "new" | null>(null)
  const [inviting, setInviting] = useState<GuestMinister | null>(null)
  const s = data?.stats
  const guests = (data?.guests ?? []).filter((g) => !search || `${g.fullName} ${g.churchName ?? ""}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Guest ministers" icon={Mic2} value={s?.guests.toLocaleString()} hint="In the register" />
        <StatCard label="Ministered this year" icon={CheckCircle2} tone="success" value={s?.thisYear.toLocaleString()} />
        <StatCard label="Waiting to confirm" icon={Clock} tone="gold" value={s?.awaiting.toLocaleString()} hint="Upcoming invitations" />
        <StatCard label="Hosting costs this year" icon={Wallet} tone="info" value={s && money(s.facilitation)}
          hint={s && [s.inKind ? `+ ${money(s.inKind)} given in kind` : null, s.unpaid ? `${s.unpaid} facilitation${s.unpaid === 1 ? "" : "s"} unpaid` : null].filter(Boolean).join(" · ") || "Church payments for guests"} />
      </section>

      <Card className="gap-0 p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Coming up</h2>
          {manage && <Button size="sm" onClick={() => setEditing("new")}><Plus className="size-4" /> New guest</Button>}
        </div>
        {!data ? <div className="h-20 animate-pulse rounded-xl bg-muted" /> : data.upcoming.length === 0 ? <p className="text-sm text-muted-foreground">No guests invited for the coming weeks.</p> : (
          <ul className="divide-y">
            {data.upcoming.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="w-20 shrink-0 text-center"><p className="text-xs uppercase text-muted-foreground">{new Date(`${i.date}T00:00`).toLocaleDateString(undefined, { weekday: "short" })}</p><p className="text-lg font-semibold">{new Date(`${i.date}T00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</p></div>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(i.guestId)}>
                  <p className="font-medium hover:underline">{i.guest}</p>
                  <p className="text-xs text-muted-foreground">{humanize(i.purpose)}{i.service ? ` · ${i.service}` : ""}{i.topic ? ` · “${i.topic}”` : ""}{i.host ? ` · host ${i.host}` : ""}</p>
                </button>
                <Badge variant={STATUS[i.status].variant}>{STATUS[i.status].label}</Badge>
                {manage && <InvitationActions inv={i} />}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <h2 className="font-semibold">Register</h2>
          <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or church…" className="pl-9" /></div>
        </div>
        {!data ? <div className="h-40 animate-pulse bg-muted" /> : guests.length === 0 ? <EmptyState icon={Mic2} title="No guest ministers yet" description="Add the ministers you invite, then send invitations from their page." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Minister</TableHead><TableHead className="hidden md:table-cell">Church</TableHead><TableHead className="text-right">Visits</TableHead><TableHead className="hidden sm:table-cell">Last / next</TableHead><TableHead className="w-24">Again?</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
            <TableBody>
              {guests.map((g) => (
                <TableRow key={g.id} className="cursor-pointer" onClick={() => setOpen(g.id)}>
                  <TableCell><div className="flex items-center gap-3"><PersonAvatar name={g.name} /><div><p className="font-medium">{g.fullName}</p>{g.phone && <p className="text-xs text-muted-foreground">{g.phone}</p>}</div></div></TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{g.churchName ?? "—"}{g.denomination ? ` · ${g.denomination}` : ""}</TableCell>
                  <TableCell className="text-right tabular">{g.sermons ?? 0}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{g.nextVisit ? <span className="text-foreground">Next {date(g.nextVisit)}</span> : g.lastVisit ? `Last ${date(g.lastVisit)}` : "—"}</TableCell>
                  <TableCell>{g.inviteAgain === true ? <ThumbsUp className="size-4 text-success" aria-label="Would invite again" /> : g.inviteAgain === false ? <ThumbsDown className="size-4 text-muted-foreground" aria-label="Would not invite again" /> : ""}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>{manage && <Button size="sm" variant="outline" onClick={() => setInviting(g)}>Invite</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {open && <GuestDialog id={open} manage={manage} onClose={() => setOpen(null)} onEdit={(g) => (setOpen(null), setEditing(g))} onInvite={(g) => setInviting(g)} />}
      {editing && <GuestForm record={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} onSaved={(id) => setOpen(id)} />}
      {inviting && <InviteForm guest={inviting} onClose={() => setInviting(null)} />}
    </>
  )
}

function InvitationActions({ inv, onDone }: { inv: GuestInvitation; onDone?: () => void }) {
  const { can } = useAuth()
  const [dialog, setDialog] = useState<null | "confirm" | "complete" | "pay" | "edit" | "cancel">(null)
  const done = () => (refresh(), onDone?.())
  const open = ["invited", "confirmed"].includes(inv.status)
  return (
    <>
      <div className="flex items-center gap-1">
        {inv.status === "invited" && <Button size="sm" onClick={() => setDialog("confirm")}><CalendarCheck className="size-4" /> Confirm</Button>}
        {inv.status === "confirmed" && inv.date <= today() && <Button size="sm" onClick={() => setDialog("complete")}><CheckCircle2 className="size-4" /> Mark done</Button>}
        {inv.status === "completed" && !inv.paid && (inv.facilitation ?? 0) > 0 && can("finance.manage") && <Button size="sm" variant="outline" onClick={() => setDialog("pay")}><Wallet className="size-4" /> Pay</Button>}
        {inv.status === "completed" && !inv.thanked && inv.guestPhone && <Button size="sm" variant="outline" onClick={async () => { if (await runAction(() => post(`/invitations/${inv.id}/thank`), "Thank-you SMS sent")) done() }}><HeartHandshake className="size-4" /> Thank</Button>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label="More"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDialog("edit")}><Pencil className="size-4" /> Edit visit</DropdownMenuItem>
            {inv.sermonId && <DropdownMenuItem asChild><Link href={`/sermons?open=${inv.sermonId}`}><Mic2 className="size-4" /> Open sermon</Link></DropdownMenuItem>}
            {open && <><DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { if (await runAction(() => patch(`/invitations/${inv.id}`, { status: "declined" }), "Marked as declined")) done() }}><XCircle className="size-4" /> They declined</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDialog("cancel")}><Trash2 className="size-4" /> Cancel invitation</DropdownMenuItem></>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {dialog === "confirm" && <ConfirmVisit inv={inv} onClose={() => setDialog(null)} onDone={done} />}
      {dialog === "complete" && <CompleteVisit inv={inv} onClose={() => setDialog(null)} onDone={done} />}
      {dialog === "pay" && <PayVisit inv={inv} onClose={() => setDialog(null)} onDone={done} />}
      {dialog === "edit" && <InviteForm guest={{ id: inv.guestId, fullName: inv.guest ?? "" } as GuestMinister} record={inv} onClose={() => setDialog(null)} onDone={done} />}
      {dialog === "cancel" && <ConfirmDialog open onOpenChange={(o) => !o && setDialog(null)} title="Cancel this invitation?" description="A planned rota entry for it is removed too." confirmLabel="Cancel invitation"
        onConfirm={async () => { const ok = await runAction(() => del(`/invitations/${inv.id}`), "Invitation cancelled"); if (ok) done(); return ok }} />}
    </>
  )
}

function GuestDialog({ id, manage, onClose, onEdit, onInvite }: { id: string; manage: boolean; onClose: () => void; onEdit: (g: GuestMinister) => void; onInvite: (g: GuestMinister) => void }) {
  const { data: g, mutate: reload } = useApi<GuestDetail>(`/guests/${id}`)
  const [costsFor, setCostsFor] = useState<string | null>(null)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        {!g ? <><DialogTitle className="sr-only">Loading</DialogTitle><div className="h-60 animate-pulse rounded-xl bg-muted" /></> : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <PersonAvatar name={g.name} className="size-12" />
                <div>
                  <DialogTitle className="text-xl">{g.fullName}</DialogTitle>
                  <DialogDescription>{[g.churchName, g.denomination].filter(Boolean).join(" · ") || "Guest minister"}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {g.phone && <Button size="sm" variant="outline" asChild><a href={`tel:${g.phone}`}><Phone className="size-4" /> {g.phone}</a></Button>}
              {g.inviteAgain === true && <Badge variant="success" className="gap-1"><ThumbsUp className="size-3" /> Would invite again</Badge>}
              {g.inviteAgain === false && <Badge variant="muted" className="gap-1"><ThumbsDown className="size-3" /> Not again</Badge>}
            </div>
            {g.notes && <p className="whitespace-pre-line rounded-xl bg-muted px-3 py-2 text-sm">{g.notes}</p>}

            <section>
              <h3 className="mb-2 text-sm font-semibold">Visits</h3>
              {g.invitations.length === 0 ? <p className="text-sm text-muted-foreground">Not invited yet.</p> : (
                <ul className="divide-y rounded-xl border">
                  {g.invitations.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{longDate(i.date)}{i.service ? ` · ${i.service}` : ""}</p>
                        <p className="text-xs text-muted-foreground">{humanize(i.purpose)}{i.topic ? ` · “${i.topic}”` : ""}{i.facilitation ? ` · ${money(i.facilitation)}${i.paid ? " paid" : " agreed"}` : ""}{i.thanked ? " · thanked" : ""}</p>
                        {i.feedback && <p className="mt-0.5 text-xs italic text-muted-foreground">“{i.feedback}”</p>}
                      </div>
                      <Badge variant={STATUS[i.status].variant}>{STATUS[i.status].label}</Badge>
                      <Button size="sm" variant={costsFor === i.id ? "default" : "ghost"} className="h-7" onClick={() => setCostsFor(costsFor === i.id ? null : i.id)}><Wallet className="size-3.5" /> Costs</Button>
                      {manage && <InvitationActions inv={i} onDone={() => reload()} />}
                      {costsFor === i.id && <div className="basis-full"><UpkeepCosts subjectType="invitation" subjectId={i.id} person={g.fullName} /></div>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {g.sermons.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Preached here</h3>
                <ul className="space-y-1 text-sm">
                  {g.sermons.map((s) => <li key={s.id} className="flex flex-wrap gap-x-2"><span className="text-muted-foreground">{date(s.date)}</span><span className="font-medium">{s.title ?? s.theme ?? "Sermon"}</span>{s.scriptures.length > 0 && <span className="text-muted-foreground">· {s.scriptures.join("; ")}</span>}</li>)}
                </ul>
              </section>
            )}

            <Attachments type="guest" id={g.id} canEdit={manage} hint="CV, ordination or recommendation letter, photo" suggestions={["CV", "Recommendation letter", "Photo"]} />

            <DialogFooter>
              {manage && <Button variant="outline" onClick={() => onEdit(g)}><Pencil className="size-4" /> Edit</Button>}
              {manage && <Button onClick={() => onInvite(g)}><Plus className="size-4" /> Invite</Button>}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function GuestForm({ record, onClose, onSaved }: { record?: GuestMinister; onClose: () => void; onSaved?: (id: string) => void }) {
  const [title, setTitle] = useState(record?.title ?? "Rev.")
  const [again, setAgain] = useState<string>(record?.inviteAgain === null || record?.inviteAgain === undefined ? "unknown" : record.inviteAgain ? "yes" : "no")
  const { handleSubmit, pending, error } = useApiForm(async (fd) => {
    const body = { title: title === "none" ? null : title, name: str(fd, "name"), churchName: str(fd, "churchName"), denomination: str(fd, "denomination"),
      phone: str(fd, "phone"), email: str(fd, "email"), notes: str(fd, "notes"), inviteAgain: again === "unknown" ? null : again === "yes" }
    if (record) await patch(`/guests/${record.id}`, body)
    else {
      const r = await post<{ data: { id: string } }>("/guests", body)
      onSaved?.(r.data.id)
    }
    refresh()
    onClose()
  }, record ? "Saved" : "Guest added")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{record ? `Edit ${record.fullName}` : "New guest minister"}</DialogTitle><DialogDescription>Their details are used on invitations, the preaching rota and thank-you messages.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="gm-t">Title</Label>
            <Select value={title} onValueChange={(v) => v && setTitle(v)}>
              <SelectTrigger id="gm-t" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">—</SelectItem>{GUEST_TITLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="gm-n">Name</Label><Input id="gm-n" name="name" defaultValue={record?.name} required />{error?.field("name") && <p className="text-xs text-destructive">{error.field("name")}</p>}</div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="gm-c">Church / ministry</Label><Input id="gm-c" name="churchName" defaultValue={record?.churchName ?? ""} placeholder="e.g. St Paul's Cathedral, Lira" /></div>
          <div className="space-y-2"><Label htmlFor="gm-d">Denomination</Label><Input id="gm-d" name="denomination" defaultValue={record?.denomination ?? ""} placeholder="e.g. Anglican" /></div>
          <div className="space-y-2"><Label htmlFor="gm-p">Phone</Label><Input id="gm-p" name="phone" type="tel" defaultValue={record?.phone ?? ""} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="gm-e">Email</Label><Input id="gm-e" name="email" type="email" defaultValue={record?.email ?? ""} /></div>
          {record && (
            <div className="space-y-2 sm:col-span-3">
              <Label>Would you invite them again?</Label>
              <div className="flex gap-1">{[["yes", "Yes"], ["no", "No"], ["unknown", "Not decided"]].map(([k, l]) => <Button key={k} type="button" size="sm" variant={again === k ? "default" : "outline"} onClick={() => setAgain(k)}>{l}</Button>)}</div>
            </div>
          )}
          <div className="space-y-2 sm:col-span-3"><Label htmlFor="gm-no">Notes</Label><Textarea id="gm-no" name="notes" rows={2} defaultValue={record?.notes ?? ""} placeholder="Preferences, dietary needs, who recommended them…" /></div>
          <DialogFooter className="sm:col-span-3"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function InviteForm({ guest, record, onClose, onDone }: { guest: GuestMinister; record?: GuestInvitation; onClose: () => void; onDone?: () => void }) {
  const { services } = useSettings()
  const [purpose, setPurpose] = useState<string>(record?.purpose ?? "preaching")
  const [service, setService] = useState(record?.service ?? services[1] ?? services[0] ?? "")
  const { handleSubmit, pending, error } = useApiForm(async (fd) => {
    const host = str(fd, "hostMemberId")
    const body = { date: str(fd, "date"), service: service === "none" ? null : service || null, purpose, topic: str(fd, "topic"),
      hostMemberId: host ? Number(host) : null, accommodation: str(fd, "accommodation"), facilitation: num(fd, "facilitation") }
    if (record) await patch(`/invitations/${record.id}`, body)
    else await post(`/guests/${guest.id}/invitations`, body)
    refresh()
    onDone?.()
    onClose()
  }, record ? "Visit updated" : "Invitation recorded")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{record ? "Edit visit" : `Invite ${guest.fullName}`}</DialogTitle><DialogDescription>When they accept, confirm the visit: it goes on the preaching rota and they get the details by SMS.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="iv-d">Date</Label><Input id="iv-d" name="date" type="date" defaultValue={record?.date ?? ""} required />{error?.field("date") && <p className="text-xs text-destructive">{error.field("date")}</p>}</div>
          <div className="space-y-2">
            <Label htmlFor="iv-p">For</Label>
            <Select value={purpose} onValueChange={(v) => v && setPurpose(v)}>
              <SelectTrigger id="iv-p" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{INVITATION_PURPOSES.map((p) => <SelectItem key={p} value={p}>{humanize(p)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="iv-s">Service</Label>
            <Select value={service || "none"} onValueChange={(v) => v && setService(v)}>
              <SelectTrigger id="iv-s" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Not a Sunday service</SelectItem>{services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="iv-f">Facilitation ({CURRENCY})</Label><Input id="iv-f" name="facilitation" type="number" min="0" defaultValue={record?.facilitation ?? ""} placeholder="Transport / honorarium" /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="iv-t">Theme / topic</Label><Input id="iv-t" name="topic" defaultValue={record?.topic ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="iv-h">Host (member)</Label><MemberPicker id="iv-h" name="hostMemberId" initial={record?.hostMemberId && record.host ? { id: record.hostMemberId, name: record.host } : null} /></div>
          <div className="space-y-2"><Label htmlFor="iv-a">Accommodation</Label><Input id="iv-a" name="accommodation" defaultValue={record?.accommodation ?? ""} placeholder="e.g. Vicarage guest room" /></div>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : record ? "Save" : "Record invitation"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmVisit({ inv, onClose, onDone }: { inv: GuestInvitation; onClose: () => void; onDone: () => void }) {
  const [sendSms, setSendSms] = useState(!!inv.guestPhone)
  const [pending, setPending] = useState(false)
  const submit = async () => {
    setPending(true)
    const ok = await runAction(() => post(`/invitations/${inv.id}/confirm`, { sendSms }), inv.purpose === "preaching" && inv.service ? "Confirmed and added to the preaching rota" : "Confirmed")
    setPending(false)
    if (ok) (onDone(), onClose())
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Confirm {inv.guest}</DialogTitle><DialogDescription>{longDate(inv.date)}{inv.service ? ` · ${inv.service}` : ""}</DialogDescription></DialogHeader>
        <ul className="space-y-1.5 text-sm">
          {inv.purpose === "preaching" && inv.service && <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> Added to the preaching rota for that service.</li>}
          <li className="flex gap-2"><MessageSquareText className="mt-0.5 size-4 shrink-0 text-primary" /> {inv.guestPhone ? "An SMS with the date, time, theme and host, plus a reminder the evening before." : "No phone number, so no SMS will be sent."}</li>
        </ul>
        {inv.guestPhone && <div className="flex items-center justify-between rounded-xl border bg-secondary/40 px-4 py-3"><Label htmlFor="cv-sms">Text {inv.guestPhone}</Label><Switch id="cv-sms" checked={sendSms} onCheckedChange={setSendSms} /></div>}
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={pending}>{pending ? "Confirming…" : "Confirm visit"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CompleteVisit({ inv, onClose, onDone }: { inv: GuestInvitation; onClose: () => void; onDone: () => void }) {
  const [again, setAgain] = useState<boolean | null>(null)
  const { handleSubmit, pending } = useApiForm(async (fd) => {
    const refs = (str(fd, "scriptures") ?? "").split(/[;\n]+/).map((x) => x.trim()).filter(Boolean)
    await post(`/invitations/${inv.id}/complete`, { feedback: str(fd, "feedback"), inviteAgain: again, title: str(fd, "title"), scriptures: refs })
    onDone()
    onClose()
  }, "Visit recorded")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>How did it go?</DialogTitle><DialogDescription>{inv.guest} · {longDate(inv.date)}. {inv.sermonId ? "The rota entry becomes a preached sermon." : ""}</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {inv.sermonId && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="cp-t">Sermon title</Label><Input id="cp-t" name="title" /></div>
              <div className="space-y-2"><Label htmlFor="cp-s">Passages (separate with ;)</Label><Input id="cp-s" name="scriptures" placeholder="e.g. Heb 11:1-6; Rom 5:1" /></div>
            </div>
          )}
          <div className="space-y-2"><Label htmlFor="cp-f">Feedback</Label><Textarea id="cp-f" name="feedback" rows={3} placeholder="What members said, response to the altar call…" /></div>
          <div className="space-y-2">
            <Label>Would you invite them again?</Label>
            <div className="flex gap-1"><Button type="button" size="sm" variant={again === true ? "default" : "outline"} onClick={() => setAgain(true)}><ThumbsUp className="size-4" /> Yes</Button><Button type="button" size="sm" variant={again === false ? "default" : "outline"} onClick={() => setAgain(false)}><ThumbsDown className="size-4" /> No</Button></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PayVisit({ inv, onClose, onDone }: { inv: GuestInvitation; onClose: () => void; onDone: () => void }) {
  const [method, setMethod] = useState("Mobile Money")
  const { handleSubmit, pending, error } = useApiForm(async (fd) => {
    await post(`/invitations/${inv.id}/pay`, { amount: num(fd, "amount"), date: str(fd, "date"), paymentMethod: method })
    onDone()
    onClose()
  }, "Facilitation paid and recorded in Accounts")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Pay facilitation</DialogTitle><DialogDescription>To {inv.guest}. Recorded as an expense under Guest ministers.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="pv-a">Amount ({CURRENCY})</Label><Input id="pv-a" name="amount" type="number" min="1" defaultValue={inv.facilitation ?? ""} required />{error?.field("amount") && <p className="text-xs text-destructive">{error.field("amount")}</p>}</div>
          <div className="space-y-2"><Label htmlFor="pv-d">Date</Label><Input id="pv-d" name="date" type="date" max={today()} defaultValue={today()} required /></div>
          <div className="space-y-2">
            <Label htmlFor="pv-m">Paid by</Label>
            <Select value={method} onValueChange={(v) => v && setMethod(v)}><SelectTrigger id="pv-m" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Paying…" : "Record payment"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ================================================================ placements

const KIND = { teaching: { label: "Teaching practice", icon: School }, ministry: { label: "Ministry placement", icon: GraduationCap } } as const

function Placements() {
  const { can } = useAuth()
  const manage = can("members.manage")
  const { data } = useSWR<{ data: Placement[]; stats: PlacementStats }>("/placements", (k: string) => api<{ data: Placement[]; stats: PlacementStats }>(k))
  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<Placement | "new" | null>(null)
  const rows = data?.data ?? []
  const s = data?.stats
  const groups = [["active", "On placement now"], ["upcoming", "Coming"], ["completed", "Past placements"]] as const
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="On placement now" icon={GraduationCap} value={s?.active.toLocaleString()} hint={s && `${s.upcoming} coming`} />
        <StatCard label="Ending in 2 weeks" icon={Clock} tone="gold" value={s?.endingSoon.toLocaleString()} hint="Plan the send-off" />
        <StatCard label="This year" icon={CheckCircle2} tone="success" value={s?.thisYear.toLocaleString()} />
        <StatCard label="Institutions" icon={School} tone="info" value={s?.institutions.toLocaleString()} hint="Universities, colleges, seminaries" />
      </section>
      <div className="flex justify-end">{manage && <Button onClick={() => setEditing("new")}><Plus className="size-4" /> New placement</Button>}</div>
      {!data ? <div className="h-40 animate-pulse rounded-2xl bg-muted" /> : rows.length === 0 ? <Card className="py-0"><EmptyState icon={GraduationCap} title="No placements yet" description="Record teaching-practice or ministry students attached to the church." /></Card> : groups.map(([key, title]) => {
        const list = rows.filter((p) => p.status === key)
        if (!list.length) return null
        return (
          <section key={key} className="space-y-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.map((p) => {
                const K = KIND[p.kind]
                return (
                  <Card key={p.id} className="cursor-pointer gap-0 p-5 transition hover:-translate-y-0.5 hover:border-primary/25" onClick={() => setOpen(p.id)}>
                    <div className="flex items-start gap-3">
                      <PersonAvatar name={p.name} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.institution}{p.course ? ` · ${p.course}` : ""}</p>
                      </div>
                      <Badge variant="outline" className="gap-1"><K.icon className="size-3" />{p.kind === "teaching" ? "Teaching" : "Ministry"}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{date(p.startDate)} – {p.endDate ? date(p.endDate) : "open"}{p.weeks ? ` · ${p.weeks} weeks` : ""}</p>
                    {p.assignments.length > 0 && <p className="mt-1 truncate text-sm">{p.assignments.map((a) => a.area + (a.detail ? ` (${a.detail})` : "")).join(" · ")}</p>}
                    <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs">
                      <span className="text-muted-foreground">{p.mentor ? `Mentor: ${p.mentor}` : "No mentor"}</span>
                      {p.status === "active" && p.daysLeft !== null && <span className={cn(p.daysLeft <= 14 ? "font-medium text-warning" : "text-muted-foreground")}>{p.daysLeft} days left</span>}
                      {p.collection && <span className="flex items-center gap-1 text-success"><Gift className="size-3.5" />{money(p.collection.given)}</span>}
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>
        )
      })}
      {open && <PlacementDialog id={open} manage={manage} onClose={() => setOpen(null)} onEdit={(p) => (setOpen(null), setEditing(p))} />}
      {editing && <PlacementForm record={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function PlacementDialog({ id, manage, onClose, onEdit }: { id: string; manage: boolean; onClose: () => void; onEdit: (p: Placement) => void }) {
  const { data: p, mutate: reload } = useApi<Placement>(`/placements/${id}`)
  const [starting, setStarting] = useState(false)
  if (!p) return <Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent><DialogTitle className="sr-only">Loading</DialogTitle><div className="h-60 animate-pulse rounded-xl bg-muted" /></DialogContent></Dialog>
  const K = KIND[p.kind]
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <PersonAvatar name={p.name} className="size-12" />
            <div>
              <DialogTitle className="text-xl">{p.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-1.5"><K.icon className="size-3.5" />{K.label} · {p.institution}{p.course ? ` · ${p.course}` : ""}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <Info label="Placement" value={`${date(p.startDate)} – ${p.endDate ? date(p.endDate) : "open"}`} />
          <Info label="Church mentor" value={p.mentor} />
          <Info label="Institution supervisor" value={p.supervisor ? `${p.supervisor}${p.supervisorPhone ? ` · ${p.supervisorPhone}` : ""}` : null} />
          <Info label="Phone" value={p.phone} />
          <Info label="Send-off" value={p.sendOffDate ? longDate(p.sendOffDate) : null} />
          <div><p className="text-xs text-muted-foreground">Mentor&apos;s rating</p><p className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn("size-4", (p.rating ?? 0) >= n ? "fill-gold text-gold" : "text-muted-foreground/40")} />)}</p></div>
        </div>
        {p.assignments.length > 0 && (
          <section><h3 className="mb-2 text-sm font-semibold">Serving in</h3><ul className="flex flex-wrap gap-2">{p.assignments.map((a, i) => <li key={i} className="rounded-full border px-3 py-1 text-sm">{a.area}{a.detail && <span className="text-muted-foreground"> · {a.detail}</span>}</li>)}</ul></section>
        )}
        {p.report && <section><h3 className="mb-1 text-sm font-semibold">Report for the institution</h3><p className="whitespace-pre-line rounded-xl bg-muted px-3 py-2 text-sm">{p.report}</p></section>}

        <section className="rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Gift className="size-4 text-gold" /> Send-off appreciation</h3>
              <p className="text-xs text-muted-foreground">Members&apos; gifts to {p.name.split(" ")[0]}: recorded with receipts, but not church money.</p>
            </div>
            {p.collection ? (
              <Button size="sm" variant="outline" asChild><Link href={`/collections?open=${p.collection.id}`}>Open collection →</Link></Button>
            ) : manage && <Button size="sm" onClick={() => setStarting(true)}><Plus className="size-4" /> Start collection</Button>}
          </div>
          {p.collection && (
            <p className="mt-2 text-sm"><b className="tabular">{money(p.collection.given)}</b>{p.collection.target ? <span className="text-muted-foreground"> of {money(p.collection.target)}</span> : ""} given
              {p.collection.status === "handed_over" && <span className="text-success"> · handed over {date(p.collection.handedOverOn)}{p.collection.gift ? ` (${p.collection.gift})` : ""}</span>}</p>
          )}
        </section>

        <UpkeepCosts subjectType="placement" subjectId={p.id} person={p.name} />

        <Attachments type="placement" id={p.id} canEdit={manage} hint="Placement letter, timetable, the institution's assessment form" suggestions={["Placement letter", "Assessment form", "Timetable"]} />

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" asChild><Link href={`/guests/print?id=${p.id}&doc=report`} target="_blank"><Printer className="size-4" /> Report</Link></Button>
          <Button variant="outline" asChild><Link href={`/guests/print?id=${p.id}&doc=letter`} target="_blank"><Printer className="size-4" /> Appreciation letter</Link></Button>
          {manage && <Button onClick={() => onEdit(p)}><Pencil className="size-4" /> Edit</Button>}
        </DialogFooter>
        {starting && <StartCollection placement={p} onClose={() => setStarting(false)} onDone={() => (reload(), refresh())} />}
      </DialogContent>
    </Dialog>
  )
}

function Info({ label, value }: { label: string; value: string | null }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value ?? <span className="font-normal text-muted-foreground">—</span>}</p></div>
}

function StartCollection({ placement, onClose, onDone }: { placement: Placement; onClose: () => void; onDone: () => void }) {
  const { handleSubmit, pending } = useApiForm(async (fd) => {
    await post(`/placements/${placement.id}/collection`, { target: num(fd, "target"), deadline: str(fd, "deadline") })
    onDone()
    onClose()
  }, "Send-off collection started")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Send-off for {placement.name}</DialogTitle><DialogDescription>{placement.mentor ? `${placement.mentor} (mentor) coordinates it.` : "Members give toward a gift."} Gifts get a receipt and an optional thank-you SMS.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="sc-t">Target ({CURRENCY}, optional)</Label><Input id="sc-t" name="target" type="number" min="0" /></div>
          <div className="space-y-2"><Label htmlFor="sc-d">Collect by</Label><Input id="sc-d" name="deadline" type="date" defaultValue={placement.sendOffDate ?? placement.endDate ?? ""} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Starting…" : "Start collection"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const AREAS = ["Sunday school", "Youth", "Choir", "Cell group", "Preaching", "Church school", "Visitation", "Administration", "Other"]

function PlacementForm({ record, onClose }: { record?: Placement; onClose: () => void }) {
  const [kind, setKind] = useState(record?.kind ?? "teaching")
  const [rating, setRating] = useState(record?.rating ?? 0)
  const [allowFreq, setAllowFreq] = useState<"weekly" | "monthly">(record?.allowanceFrequency ?? "weekly")
  const [assignments, setAssignments] = useState(record?.assignments.length ? record.assignments : [{ area: "Sunday school", detail: "" }])
  const { handleSubmit, pending, error } = useApiForm(async (fd) => {
    const mentor = str(fd, "mentorMemberId")
    const body = {
      kind, name: str(fd, "name"), phone: str(fd, "phone"), email: str(fd, "email"), institution: str(fd, "institution"), course: str(fd, "course"),
      supervisor: str(fd, "supervisor"), supervisorPhone: str(fd, "supervisorPhone"), mentorMemberId: mentor ? Number(mentor) : null,
      startDate: str(fd, "startDate"), endDate: str(fd, "endDate"), sendOffDate: str(fd, "sendOffDate"),
      allowanceAmount: num(fd, "allowanceAmount"), allowanceFrequency: num(fd, "allowanceAmount") ? allowFreq : null,
      assignments: assignments.filter((a) => a.area).map((a) => ({ area: a.area, detail: a.detail || null })),
      rating: rating || null, report: str(fd, "report"), notes: str(fd, "notes"),
    }
    if (record) await patch(`/placements/${record.id}`, body)
    else await post("/placements", body)
    refresh()
    onClose()
  }, record ? "Placement saved" : "Placement added")
  const fe = (k: string) => error?.field(k) && <p className="text-xs text-destructive">{error.field(k)}</p>
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{record ? `Edit ${record.name}` : "New placement"}</DialogTitle><DialogDescription>A student attached to the church for teaching practice or ministry training.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="flex gap-2 sm:col-span-2">
            {(Object.keys(KIND) as Array<keyof typeof KIND>).map((k) => { const K = KIND[k]; return <Button key={k} type="button" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}><K.icon className="size-4" /> {K.label}</Button> })}
          </div>
          <div className="space-y-2"><Label htmlFor="pl-n">Student&apos;s name</Label><Input id="pl-n" name="name" defaultValue={record?.name} required />{fe("name")}</div>
          <div className="space-y-2"><Label htmlFor="pl-p">Phone</Label><Input id="pl-p" name="phone" type="tel" defaultValue={record?.phone ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="pl-i">{kind === "teaching" ? "University / college" : "Seminary / college"}</Label><Input id="pl-i" name="institution" defaultValue={record?.institution} required placeholder={kind === "teaching" ? "e.g. Kyambogo University" : "e.g. Bishop Tucker School of Divinity"} />{fe("institution")}</div>
          <div className="space-y-2"><Label htmlFor="pl-c">Course / year</Label><Input id="pl-c" name="course" defaultValue={record?.course ?? ""} placeholder={kind === "teaching" ? "e.g. B.Ed, Year 2" : "e.g. Diploma in Theology"} /></div>
          <div className="space-y-2"><Label htmlFor="pl-s">Institution supervisor</Label><Input id="pl-s" name="supervisor" defaultValue={record?.supervisor ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="pl-sp">Supervisor&apos;s phone</Label><Input id="pl-sp" name="supervisorPhone" type="tel" defaultValue={record?.supervisorPhone ?? ""} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="pl-m">Church mentor</Label><MemberPicker id="pl-m" name="mentorMemberId" initial={record?.mentorMemberId && record.mentor ? { id: record.mentorMemberId, name: record.mentor } : null} /></div>
          <div className="space-y-2"><Label htmlFor="pl-sd">Starts</Label><Input id="pl-sd" name="startDate" type="date" defaultValue={record?.startDate ?? today()} required /></div>
          <div className="space-y-2"><Label htmlFor="pl-ed">Ends</Label><Input id="pl-ed" name="endDate" type="date" defaultValue={record?.endDate ?? ""} />{fe("endDate")}</div>
          <div className="space-y-2"><Label htmlFor="pl-al">Allowance ({CURRENCY}, optional)</Label><Input id="pl-al" name="allowanceAmount" type="number" min="0" defaultValue={record?.allowanceAmount ?? ""} placeholder="Stipend / upkeep" /></div>
          <div className="space-y-2">
            <Label htmlFor="pl-af">Paid</Label>
            <Select value={allowFreq} onValueChange={(x) => x && setAllowFreq(x as "weekly" | "monthly")}><SelectTrigger id="pl-af" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Serving in</Label>
            {assignments.map((a, i) => (
              <div key={i} className="flex gap-2">
                <Select value={a.area} onValueChange={(v) => v && setAssignments(assignments.map((x, k) => (k === i ? { ...x, area: v } : x)))}>
                  <SelectTrigger className="w-44" aria-label="Area"><SelectValue /></SelectTrigger>
                  <SelectContent>{AREAS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
                <Input aria-label="Detail" value={a.detail ?? ""} onChange={(e) => setAssignments(assignments.map((x, k) => (k === i ? { ...x, detail: e.target.value } : x)))} placeholder="e.g. P5 class, Sunday 10am" />
                <Button type="button" variant="ghost" size="icon" onClick={() => setAssignments(assignments.filter((_, k) => k !== i))} aria-label="Remove"><Trash2 className="size-4" /></Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setAssignments([...assignments, { area: "Other", detail: "" }])}><Plus className="size-4" /> Add</Button>
          </div>
          {record && (
            <>
              <div className="space-y-2"><Label>Mentor&apos;s rating</Label><div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setRating(n === rating ? 0 : n)} aria-label={`${n} stars`}><Star className={cn("size-6", rating >= n ? "fill-gold text-gold" : "text-muted-foreground/40")} /></button>)}</div></div>
              <div className="space-y-2"><Label htmlFor="pl-so">Send-off date</Label><Input id="pl-so" name="sendOffDate" type="date" defaultValue={record.sendOffDate ?? ""} /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="pl-r">Report for the institution</Label><Textarea id="pl-r" name="report" rows={4} defaultValue={record.report ?? ""} placeholder="Punctuality, relationship with learners / members, initiative, areas to grow…" /></div>
            </>
          )}
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="pl-no">Notes</Label><Textarea id="pl-no" name="notes" rows={2} defaultValue={record?.notes ?? ""} /></div>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save placement"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
