"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { mutate } from "swr"
import { toast } from "sonner"
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Rss, Copy, RefreshCw, Repeat, MapPin, Bell, Pencil, Trash2, Cross, List, LayoutGrid, Church } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Page, PageHeader } from "@/components/page"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, runAction, str, useApiForm } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { ApiError, del, patch, post, qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { humanize, longDate } from "@/lib/format"
import { KIND_META, LITURGICAL, REMIND_OPTIONS, hrefFor, iso, parseIsoDay, timeOf } from "@/lib/calendar"
import {
  EVENT_TYPES,
  type CalendarItem,
  type CalendarKind,
  type CalendarRange,
  type CellGroupIndex,
  type ChurchDay,
  type ChurchEvent,
  type LiturgicalColour,
  type Ministry,
  type Observance,
  type Project,
} from "@/lib/types"
import { cn } from "@/lib/utils"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/calendar") || k.startsWith("/events") || k.startsWith("/observances")))
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const ALL_KINDS = Object.keys(KIND_META) as CalendarKind[]
const FILTER_KEY = "synago.calendarHidden"

function readHidden(): CalendarKind[] {
  try {
    return JSON.parse(localStorage.getItem(FILTER_KEY) ?? "[]")
  } catch {
    return []
  }
}

/** 6-week grid (Monday first) covering the month. */
function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset)
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

const covers = (d: ChurchDay, day: string) => day >= d.start && day <= d.end

export function CalendarContent() {
  const router = useRouter()
  const { can } = useAuth()
  const canManage = can("alerts.manage")
  const [month, setMonth] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [view, setView] = useState<"month" | "agenda" | "year">("month")
  const [hidden, setHidden] = useState<CalendarKind[]>(() => (typeof window === "undefined" ? [] : readHidden()))
  const [dayOpen, setDayOpen] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [newOn, setNewOn] = useState<string | null>(null)
  const [subscribe, setSubscribe] = useState(false)

  const grid = useMemo(() => monthGrid(month), [month])
  const from = iso(grid[0])
  const to = iso(grid[41])
  const { data, isLoading } = useApi<CalendarRange>(qs("/calendar", { from, to }))

  const items = (data?.items ?? []).filter((i) => !hidden.includes(i.kind))
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarItem[]>()
    for (const i of items) {
      // multi-day all-day items appear on each day they cover
      const start = parseIsoDay(i.start)
      const end = i.end ? parseIsoDay(i.end) : start
      for (let d = new Date(start); d <= end && d <= grid[41]; d.setDate(d.getDate() + 1)) {
        const k = iso(d)
        m.set(k, [...(m.get(k) ?? []), i])
      }
    }
    return m
  }, [items, grid])
  const today = data?.today ?? iso(new Date())

  const toggleKind = (k: CalendarKind) => {
    const next = hidden.includes(k) ? hidden.filter((x) => x !== k) : [...hidden, k]
    setHidden(next)
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(next))
    } catch {
      /* storage unavailable */
    }
  }

  const open = (i: CalendarItem) => {
    if (i.link?.type === "event") return setEventId(i.link.id)
    const href = hrefFor(i)
    if (href) router.push(href)
  }

  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  const season = data?.season

  return (
    <Page className="max-w-[90rem]">
      <PageHeader
        eyebrow="Office"
        title="Calendar"
        description="Services, events, meetings, burials, weddings, baptisms, birthdays and follow-ups in one place, set against the church year."
        actions={
          <>
            <Button variant="outline" onClick={() => setSubscribe(true)}><Rss className="size-4" /> Add to my phone</Button>
            {canManage && <Button onClick={() => setNewOn(today)}><Plus className="size-4" /> New event</Button>}
          </>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft className="size-4" /></Button>
            <Button variant="outline" size="icon-sm" aria-label="Next month" onClick={() => shift(1)}><ChevronRight className="size-4" /></Button>
            <h2 className="ml-2 text-xl font-semibold">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
            <Button variant="ghost" size="sm" onClick={() => { const n = new Date(); setMonth(new Date(n.getFullYear(), n.getMonth(), 1)) }}>Today</Button>
          </div>
          <div className="flex items-center gap-3">
            {season && (
              <span className="hidden items-center gap-2 rounded-full border px-3 py-1 text-sm sm:inline-flex" title="Current season of the church year">
                <span className="size-3 rounded-full ring-1 ring-black/10" style={{ background: LITURGICAL[season.colour].bg }} />
                Season of {season.name}
              </span>
            )}
            <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
              <TabsList>
                <TabsTrigger value="month"><LayoutGrid className="size-4" /> Month</TabsTrigger>
                <TabsTrigger value="agenda"><List className="size-4" /> Agenda</TabsTrigger>
                <TabsTrigger value="year"><Cross className="size-4" /> Church year</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {view !== "year" && (
          <div className="flex flex-wrap gap-1.5 border-b bg-secondary/30 px-5 py-2.5">
            {ALL_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => toggleKind(k)}
                aria-pressed={!hidden.includes(k)}
                className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition",
                  hidden.includes(k) ? "bg-transparent text-muted-foreground line-through opacity-60" : "bg-card")}
              >
                <span className={cn("size-2 rounded-full", KIND_META[k].dot)} />
                {KIND_META[k].label}
              </button>
            ))}
          </div>
        )}

        {view === "month" && (
          <div className={cn(isLoading && "opacity-60")}>
            <div className="grid grid-cols-7 border-b text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((d) => {
                const k = iso(d)
                const dayItems = byDay.get(k) ?? []
                const inMonth = d.getMonth() === month.getMonth()
                const s = data?.seasons.find((x) => covers(x, k))
                const feast = data?.feasts.find((x) => covers(x, k))
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDayOpen(k)}
                    className={cn("group relative flex min-h-28 flex-col border-b border-r p-1.5 text-left transition hover:bg-accent/40 [&:nth-child(7n)]:border-r-0",
                      !inMonth && "bg-secondary/30 text-muted-foreground")}
                  >
                    {s && <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: LITURGICAL[s.colour].bg, opacity: inMonth ? 0.85 : 0.35 }} />}
                    <div className="mt-1 flex items-start justify-between gap-1">
                      <span className={cn("flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular", k === today && "bg-primary text-primary-foreground")}>{d.getDate()}</span>
                      {feast && (
                        <span className="line-clamp-2 text-right text-[10px] font-semibold leading-tight" style={{ color: feast.colour === "white" ? undefined : LITURGICAL[feast.colour].bg }} title={feast.name}>
                          {feast.name}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {dayItems.slice(0, 3).map((i) => (
                        <div key={`${i.id}-${k}`} className={cn("truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium", KIND_META[i.kind].chip)}>
                          {timeOf(i) && <span className="mr-1 opacity-70 tabular">{timeOf(i)}</span>}
                          {i.kind === "birthday" ? `🎂 ${i.title}` : i.title}
                        </div>
                      ))}
                      {dayItems.length > 3 && <div className="px-1.5 text-[11px] font-medium text-muted-foreground">+{dayItems.length - 3} more</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {view === "agenda" && (
          <div className="divide-y">
            {grid.filter((d) => d.getMonth() === month.getMonth()).map((d) => {
              const k = iso(d)
              const dayItems = byDay.get(k) ?? []
              const feast = data?.feasts.find((x) => covers(x, k))
              if (!dayItems.length && !feast) return null
              return (
                <div key={k} className={cn("grid gap-4 px-5 py-4 sm:grid-cols-[9rem_1fr]", k === today && "bg-primary/5")}>
                  <div>
                    <p className="font-semibold">{d.toLocaleDateString(undefined, { weekday: "long" })}</p>
                    <p className="text-sm text-muted-foreground">{d.toLocaleDateString(undefined, { day: "numeric", month: "long" })}</p>
                    {feast && <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold"><span className="size-2 rounded-full" style={{ background: LITURGICAL[feast.colour].bg }} />{feast.name}</p>}
                  </div>
                  <ul className="space-y-1.5">
                    {dayItems.map((i) => <AgendaRow key={`${i.id}-${k}`} i={i} onOpen={() => open(i)} />)}
                  </ul>
                </div>
              )
            })}
            {!isLoading && !items.some((i) => i.start.slice(0, 7) === iso(month).slice(0, 7)) && (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">Nothing on the calendar this month.</p>
            )}
          </div>
        )}

        {view === "year" && <ChurchYearView year={month.getFullYear()} canManage={canManage} />}
      </Card>

      {dayOpen && (
        <Dialog open onOpenChange={(o) => !o && setDayOpen(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{parseIsoDay(dayOpen).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</DialogTitle>
              <DialogDescription>
                {[data?.seasons.find((x) => covers(x, dayOpen)), data?.feasts.find((x) => covers(x, dayOpen))].filter(Boolean).map((x) => x!.name).join(" · ") || "Ordinary day"}
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-1.5">
              {(byDay.get(dayOpen) ?? []).map((i) => <AgendaRow key={i.id} i={i} onOpen={() => { setDayOpen(null); open(i) }} />)}
              {!(byDay.get(dayOpen) ?? []).length && <li className="rounded-xl border p-4 text-sm text-muted-foreground">Nothing scheduled.</li>}
            </ul>
            {canManage && <DialogFooter><Button onClick={() => { setNewOn(dayOpen); setDayOpen(null) }}><Plus className="size-4" /> Add event on this day</Button></DialogFooter>}
          </DialogContent>
        </Dialog>
      )}

      {newOn && <EventDialog key={`new-${newOn}`} day={newOn} open onOpenChange={(o) => !o && setNewOn(null)} />}
      {eventId && <EventView id={eventId} canManage={canManage} onClose={() => setEventId(null)} />}
      <SubscribeDialog open={subscribe} onOpenChange={setSubscribe} />
    </Page>
  )
}

function AgendaRow({ i, onOpen }: { i: CalendarItem; onOpen: () => void }) {
  const clickable = i.link?.type === "event" || !!hrefFor(i)
  return (
    <li>
      <button type="button" onClick={onOpen} disabled={!clickable}
        className={cn("flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2 text-left transition", clickable && "hover:border-primary/30 hover:bg-accent/40")}>
        <span className={cn("h-8 w-1 shrink-0 rounded-full", KIND_META[i.kind].dot)} />
        <span className="w-16 shrink-0 text-xs font-semibold text-muted-foreground tabular">{timeOf(i) ?? "All day"}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
            {i.kind === "birthday" && "🎂 "}{i.title}{i.repeats && <Repeat className="size-3 shrink-0 text-muted-foreground" />}
          </span>
          {i.subtitle && <span className="block truncate text-xs text-muted-foreground">{i.subtitle}</span>}
        </span>
        <Badge variant="outline" className={cn("hidden sm:inline-flex", KIND_META[i.kind].chip)}>{KIND_META[i.kind].label.replace(/s$/, "").replace("Sunday service", "Service")}</Badge>
      </button>
    </li>
  )
}

function EventView({ id, canManage, onClose }: { id: string; canManage: boolean; onClose: () => void }) {
  const { data: e } = useApi<ChurchEvent>(`/events/${id}`)
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view")
  if (mode === "edit" && e) return <EventDialog record={e} open onOpenChange={(o) => !o && onClose()} />
  const when = e && (e.allDay ? longDate(e.startsAt.slice(0, 10)) : new Date(e.startsAt).toLocaleString(undefined, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }))
  const repeatLabel = { none: "", weekly: "Every week", monthly_nth: "Same weekday each month (e.g. first Sunday)", monthly_day: "Same date each month", yearly: "Every year" }
  return (
    <>
      <Dialog open={mode === "view"} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-lg">
          {!e ? (<><DialogTitle className="sr-only">Loading</DialogTitle><div className="h-40 animate-pulse rounded-xl bg-muted" /></>) : (
            <>
              <DialogHeader>
                <Badge variant="outline" className="w-fit capitalize">{humanize(e.type)}</Badge>
                <DialogTitle className="text-2xl">{e.title}</DialogTitle>
                <DialogDescription>{when}{e.venue ? ` · ${e.venue}` : ""}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                {e.repeat !== "none" && <p className="flex items-center gap-2"><Repeat className="size-4 text-muted-foreground" />{repeatLabel[e.repeat]}{e.repeatUntil ? ` until ${longDate(e.repeatUntil)}` : ""}</p>}
                {(e.ministry || e.cellGroup) && <p className="flex items-center gap-2"><Church className="size-4 text-muted-foreground" />{e.ministry ?? e.cellGroup}</p>}
                {e.organiser && <p className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" />Organised by {e.organiser}</p>}
                {e.remindMinutes.length > 0 && (
                  <p className="flex items-center gap-2"><Bell className="size-4 text-muted-foreground" />
                    Reminder {e.remindMinutes.map((m) => REMIND_OPTIONS.find((o) => o.minutes === m)?.label ?? `${m} min before`).join(" and ")} by {e.remindChannel === "both" ? "SMS + app" : e.remindChannel === "sms" ? "SMS" : "app"}
                  </p>
                )}
                {e.description && <p className="whitespace-pre-line text-muted-foreground">{e.description}</p>}
              </div>
              {canManage && (
                <DialogFooter>
                  <Button variant="ghost" className="mr-auto text-destructive" onClick={() => setMode("delete")}><Trash2 className="size-4" /> Delete</Button>
                  <Button onClick={() => setMode("edit")}><Pencil className="size-4" /> Edit</Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      {e && (
        <ConfirmDialog open={mode === "delete"} onOpenChange={(o) => !o && setMode("view")} title={`Delete ${e.title}`}
          description={e.repeat !== "none" ? "This deletes every occurrence and cancels its pending reminders." : "Pending reminders for it are cancelled."}
          onConfirm={async () => { const ok = await runAction(() => del(`/events/${e.id}`), "Event deleted"); if (ok) { refresh(); onClose() } return ok }} />
      )}
    </>
  )
}

function EventDialog({ record, day, open, onOpenChange }: { record?: ChurchEvent; day?: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: ministries = [] } = useApi<Ministry[]>(open ? "/ministries" : null)
  const { data: cells } = useApi<CellGroupIndex>(open ? "/cell-groups" : null)
  const [allDay, setAllDay] = useState(record?.allDay ?? false)
  const [type, setType] = useState<string>(record?.type ?? "meeting")
  const [projectId, setProjectId] = useState<string>(record?.projectId ?? "none")
  const { data: projects = [] } = useApi<Project[]>(open && type === "fundraising" ? "/projects?open=1" : null)
  const [repeat, setRepeat] = useState<string>(record?.repeat ?? "none")
  const [group, setGroup] = useState(record?.ministryId ? `m-${record.ministryId}` : record?.cellGroupId ? `c-${record.cellGroupId}` : "none")
  const [reminds, setReminds] = useState<number[]>(record?.remindMinutes ?? [])
  const [audience, setAudience] = useState<string>(record?.remindAudience?.type ?? "group")
  const [channel, setChannel] = useState<string>(record?.remindChannel ?? "sms")
  const [clash, setClash] = useState<{ message: string; clashes: Array<{ title: string; start: string }>; body: Record<string, unknown> } | null>(null)

  const save = async (body: Record<string, unknown>) => {
    if (record) await patch(`/events/${record.id}`, body)
    else await post("/events", body)
    refresh()
    onOpenChange(false)
  }

  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const date = str(fd, "date")!
    const endDate = str(fd, "endDate") ?? date
    const org = str(fd, "organiserMemberId")
    const [gType, gId] = group === "none" ? [null, null] : group.split("-")
    const body: Record<string, unknown> = {
      title: str(fd, "title"), type, description: str(fd, "description"), venue: str(fd, "venue"), allDay,
      startsAt: allDay ? `${date}T00:00` : `${date}T${str(fd, "time") ?? "09:00"}`,
      endsAt: allDay ? (endDate !== date ? `${endDate}T23:59` : null) : str(fd, "endTime") ? `${endDate}T${str(fd, "endTime")}` : null,
      repeat, repeatUntil: repeat === "none" ? null : str(fd, "repeatUntil"),
      ministryId: gType === "m" ? Number(gId) : null, cellGroupId: gType === "c" ? Number(gId) : null,
      organiserMemberId: org ? Number(org) : null,
      projectId: type === "fundraising" && projectId !== "none" ? Number(projectId) : null,
      remindMinutes: reminds.length ? reminds : null,
      remindAudience: !reminds.length || audience === "group" ? null : { type: audience },
      remindChannel: channel,
    }
    try {
      await save(body)
    } catch (e) {
      // 409 = venue already booked; let the user decide
      if (e instanceof ApiError && e.status === 409) {
        setClash({ message: e.message, clashes: (e.body.clashes as Array<{ title: string; start: string }>) ?? [], body })
        throw new Error(e.message)
      }
      throw e
    }
  }, record ? "Event updated" : "Event added")

  const startDate = record?.startsAt.slice(0, 10) ?? day
  return (
    <>
      <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{record ? `Edit ${record.title}` : "New event"}</DialogTitle><DialogDescription>Add repeats for things like “every first Sunday”. Reminders go out automatically.</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-6">
            <div className="space-y-2 sm:col-span-4"><Label htmlFor="e-title">Title</Label><Input id="e-title" name="title" defaultValue={record?.title} required /><FieldError error={error} name="title" /></div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="e-type">Kind</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="e-type" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {type === "fundraising" && (
              <div className="space-y-2 sm:col-span-6">
                <Label htmlFor="e-project">Raising for</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="e-project" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No particular project</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Contributions recorded at this event appear on the project page and its event tally.</p>
              </div>
            )}
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="e-date">Date</Label><Input id="e-date" name="date" type="date" defaultValue={startDate} required /></div>
            {allDay ? (
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="e-end">Until (optional)</Label><Input id="e-end" name="endDate" type="date" defaultValue={record?.endsAt?.slice(0, 10) ?? ""} /></div>
            ) : (
              <>
                <div className="space-y-2 sm:col-span-1"><Label htmlFor="e-time">From</Label><Input id="e-time" name="time" type="time" defaultValue={record?.startsAt.slice(11, 16) ?? "09:00"} /></div>
                <div className="space-y-2 sm:col-span-1"><Label htmlFor="e-endt">To</Label><Input id="e-endt" name="endTime" type="time" defaultValue={record?.endsAt?.slice(11, 16) ?? ""} /></div>
              </>
            )}
            <div className="flex items-end gap-2 pb-2 sm:col-span-2"><Switch id="e-all" checked={allDay} onCheckedChange={setAllDay} /><Label htmlFor="e-all">All day</Label></div>
            <div className="space-y-2 sm:col-span-3"><Label htmlFor="e-venue">Venue</Label><Input id="e-venue" name="venue" list="venues" defaultValue={record?.venue ?? ""} placeholder="Main church, church hall…" />
              <datalist id="venues">{["Main church", "Church hall", "Vestry", "Children's room", "Church grounds"].map((v) => <option key={v} value={v} />)}</datalist></div>
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="e-group">For a group</Label>
              <Select value={group} onValueChange={setGroup}>
                <SelectTrigger id="e-group" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Whole church</SelectItem>
                  {ministries.map((m) => <SelectItem key={m.id} value={`m-${m.id}`}>{m.name}</SelectItem>)}
                  {cells?.groups.map((g) => <SelectItem key={g.id} value={`c-${g.id}`}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="e-repeat">Repeats</Label>
              <Select value={repeat} onValueChange={setRepeat}>
                <SelectTrigger id="e-repeat" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Doesn&apos;t repeat</SelectItem>
                  <SelectItem value="weekly">Every week</SelectItem>
                  <SelectItem value="monthly_nth">Monthly on the same weekday (e.g. first Sunday)</SelectItem>
                  <SelectItem value="monthly_day">Monthly on the same date</SelectItem>
                  <SelectItem value="yearly">Every year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {repeat !== "none" && <div className="space-y-2 sm:col-span-3"><Label htmlFor="e-until">Until (optional)</Label><Input id="e-until" name="repeatUntil" type="date" defaultValue={record?.repeatUntil ?? ""} /></div>}
            <div className="space-y-2 sm:col-span-6"><Label htmlFor="e-org">Organiser (optional)</Label><MemberPicker id="e-org" name="organiserMemberId" initial={record?.organiserMemberId && record.organiser ? { id: record.organiserMemberId, name: record.organiser } : null} /></div>
            <div className="space-y-2 sm:col-span-6"><Label htmlFor="e-desc">Details</Label><Textarea id="e-desc" name="description" rows={2} defaultValue={record?.description ?? ""} /></div>

            <fieldset className="space-y-3 rounded-xl border p-4 sm:col-span-6">
              <legend className="flex items-center gap-1.5 px-1 text-sm font-medium"><Bell className="size-4" /> Reminders</legend>
              <div className="flex flex-wrap gap-2">
                {REMIND_OPTIONS.map((o) => {
                  const on = reminds.includes(o.minutes)
                  return (
                    <button key={o.minutes} type="button" aria-pressed={on} disabled={!on && reminds.length >= 3}
                      onClick={() => setReminds(on ? reminds.filter((m) => m !== o.minutes) : [...reminds, o.minutes].sort((a, b) => b - a))}
                      className={cn("rounded-full border px-3 py-1 text-xs font-medium", on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent")}>
                      {o.label}
                    </button>
                  )
                })}
              </div>
              {reminds.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Send to</Label>
                    <Select value={audience} onValueChange={setAudience}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="group">{group === "none" ? "All members" : "That group's members"}</SelectItem>
                        <SelectItem value="all">All members</SelectItem>
                        <SelectItem value="leaders">Church leaders</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">By</Label>
                    <Select value={channel} onValueChange={setChannel}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="sms">SMS</SelectItem><SelectItem value="app">App notification (staff & leaders)</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </fieldset>

            <DialogFooter className="sm:col-span-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "Saving…" : record ? "Save changes" : "Add event"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {clash && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setClash(null)}
          title="Venue already booked"
          tone="default"
          confirmLabel="Book anyway"
          description={
            <>
              {clash.message}
              <ul className="mt-2 list-disc pl-5">
                {clash.clashes.map((c, i) => <li key={i}>{c.title}, {new Date(c.start).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</li>)}
              </ul>
            </>
          }
          onConfirm={async () => {
            const ok = await runAction(() => save({ ...clash.body, ignoreClash: true }), record ? "Event updated" : "Event added")
            if (ok) setClash(null)
            return ok
          }}
        />
      )}
    </>
  )
}

function ChurchYearView({ year, canManage }: { year: number; canManage: boolean }) {
  const { data } = useApi<{ year: number; easter: string; seasons: ChurchDay[]; feasts: ChurchDay[] }>(qs("/calendar/church-year", { year }))
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Observance | null>(null)
  const { data: observances = [] } = useApi<Observance[]>("/observances")
  if (!data) return <div className="m-6 h-60 animate-pulse rounded-xl bg-muted" />
  const range = (d: ChurchDay) => (d.start === d.end ? longDate(d.start) : `${longDate(d.start).replace(/,? \d{4}$/, "")} – ${longDate(d.end)}`)
  return (
    <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1.2fr]">
      <section>
        <h3 className="mb-1 text-lg font-semibold">Seasons {year}</h3>
        <p className="mb-3 text-sm text-muted-foreground">Easter Day is {longDate(data.easter)}; the moveable seasons follow from it.</p>
        <ol className="space-y-1.5">
          {data.seasons.map((s, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl border px-3 py-2">
              <span className="h-8 w-1.5 rounded-full ring-1 ring-black/10" style={{ background: LITURGICAL[s.colour].bg }} />
              <span className="flex-1 font-semibold">{s.name}</span>
              <span className="text-sm text-muted-foreground">{range(s)}</span>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Feasts & observances</h3>
          {canManage && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="size-4" /> Add our own</Button>}
        </div>
        <ul className="divide-y rounded-xl border">
          {[...data.feasts].sort((a, b) => a.start.localeCompare(b.start)).map((f, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="size-3 rounded-full ring-1 ring-black/10" style={{ background: LITURGICAL[f.colour].bg }} />
              <span className="flex-1">
                <span className="font-medium">{f.name}</span>
                {f.custom && <Badge variant="gold" className="ml-2">Ours</Badge>}
                {f.note && <span className="block text-xs text-muted-foreground">{f.note}</span>}
              </span>
              <span className="text-muted-foreground tabular">{range(f)}</span>
              {f.custom && canManage && (
                <Button variant="ghost" size="icon-sm" aria-label={`Edit ${f.name}`} onClick={() => setEditing(observances.find((o) => o.id === f.id) ?? null)}><Pencil className="size-3.5" /></Button>
              )}
            </li>
          ))}
        </ul>
      </section>
      {(adding || editing) && <ObservanceDialog record={editing ?? undefined} onClose={() => { setAdding(false); setEditing(null) }} />}
    </div>
  )
}

function ObservanceDialog({ record, onClose }: { record?: Observance; onClose: () => void }) {
  const [rule, setRule] = useState<"fixed" | "easter">(record?.rule ?? "fixed")
  const [colour, setColour] = useState<LiturgicalColour>(record?.colour ?? "red")
  const { handleSubmit, pending, error } = useApiForm(async (fd) => {
    const date = str(fd, "date")
    const body = { name: str(fd, "name"), rule, colour, note: str(fd, "note"), durationDays: Number(str(fd, "durationDays") ?? 1),
      month: rule === "fixed" && date ? Number(date.slice(5, 7)) : null, day: rule === "fixed" && date ? Number(date.slice(8, 10)) : null,
      easterOffset: rule === "easter" ? Number(str(fd, "easterOffset")) : null }
    if (record) await patch(`/observances/${record.id}`, body)
    else await post("/observances", body)
    refresh()
    onClose()
  }, record ? "Observance updated" : "Added to the church year")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{record ? `Edit ${record.name}` : "Add an observance"}</DialogTitle><DialogDescription>Your patronal festival, Mothers&apos; Union day, harvest Sunday… It repeats every year.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="ob-n">Name</Label><Input id="ob-n" name="name" defaultValue={record?.name} required placeholder="St James' Day (patronal festival)" /></div>
          <div className="flex gap-2">
            {(["fixed", "easter"] as const).map((r) => (
              <Button key={r} type="button" size="sm" variant={rule === r ? "default" : "outline"} onClick={() => setRule(r)}>{r === "fixed" ? "Same date every year" : "Relative to Easter"}</Button>
            ))}
          </div>
          {rule === "fixed" ? (
            <div className="space-y-2"><Label htmlFor="ob-d">Date</Label><Input id="ob-d" name="date" type="date" required defaultValue={record?.month ? `2026-${String(record.month).padStart(2, "0")}-${String(record.day).padStart(2, "0")}` : ""} /><FieldError error={error} name="day" /><p className="text-xs text-muted-foreground">Only the day and month are used.</p></div>
          ) : (
            <div className="space-y-2"><Label htmlFor="ob-o">Days after Easter (negative = before)</Label><Input id="ob-o" name="easterOffset" type="number" min={-70} max={70} required defaultValue={record?.easterOffset ?? 0} /><FieldError error={error} name="easterOffset" /></div>
          )}
          <div className="space-y-2"><Label htmlFor="ob-len">Lasts (days)</Label><Input id="ob-len" name="durationDays" type="number" min={1} max={60} defaultValue={record?.durationDays ?? 1} /></div>
          <div className="space-y-2">
            <Label>Liturgical colour</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LITURGICAL) as LiturgicalColour[]).map((c) => (
                <button key={c} type="button" onClick={() => setColour(c)} aria-pressed={colour === c} title={LITURGICAL[c].label}
                  className={cn("size-8 rounded-full ring-1 ring-black/10 transition", colour === c && "ring-[3px] ring-primary ring-offset-2")} style={{ background: LITURGICAL[c].bg }} />
              ))}
            </div>
          </div>
          <div className="space-y-2"><Label htmlFor="ob-note">Note</Label><Input id="ob-note" name="note" defaultValue={record?.note ?? ""} /></div>
          <DialogFooter>
            {record && (
              <Button type="button" variant="ghost" className="mr-auto text-destructive"
                onClick={async () => { if (await runAction(() => del(`/observances/${record.id}`), "Removed")) { refresh(); onClose() } }}>
                <Trash2 className="size-4" /> Remove
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SubscribeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data, mutate: reload } = useApi<{ url: string }>(open ? "/calendar/feed-link" : null)
  const webcal = data?.url.replace(/^https?:/, "webcal:")
  const copy = async () => {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.url)
      toast.success("Link copied")
    } catch {
      toast.error("Couldn't copy; select the link and copy it manually")
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" /> Church calendar on your phone</DialogTitle>
          <DialogDescription>Subscribe once and services, events, meetings and feast days appear in your Google or iPhone calendar, kept up to date automatically.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Your private link</Label>
          <div className="flex gap-2">
            <Input readOnly value={data?.url ?? "…"} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button variant="outline" size="icon" aria-label="Copy link" onClick={copy}><Copy className="size-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">Keep it to yourself: anyone with it can see what you can see on the calendar.</p>
        </div>
        <ul className="space-y-2 rounded-xl bg-secondary/50 p-4 text-sm">
          <li><span className="font-semibold">iPhone:</span> tap{" "}{webcal ? <a className="text-primary underline" href={webcal}>subscribe</a> : "subscribe"}, or Settings → Calendar → Accounts → Add subscribed calendar, and paste the link.</li>
          <li><span className="font-semibold">Google Calendar:</span> on a computer, Other calendars → + → From URL, paste the link. It then shows on your Android phone too.</li>
        </ul>
        <DialogFooter>
          <Button variant="ghost" className="mr-auto" onClick={async () => { if (await runAction(() => post("/calendar/feed-link"), "New link made; the old one stops working")) reload() }}>
            <RefreshCw className="size-4" /> Make a new link
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
