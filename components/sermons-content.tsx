"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { mutate } from "swr"
import { BookOpen, Plus, Printer, Mic, Users, CalendarClock, AlertTriangle, MoreHorizontal, Pencil, Trash2, CheckCircle2, Search, MessageSquareText, PlayCircle, Library, Coins, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, PersonAvatar, StatCard, TableCard, TableSkeleton } from "@/components/page"
import { Pager } from "@/components/pager"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, runAction, str, useApiForm } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { ScriptureInput } from "@/components/scripture-input"
import { ReadingsEditor, readingsPayload, type ReadingDraft } from "@/components/readings-editor"
import { Attachments } from "@/components/attachments"
import { del, patch, post, qs, useApi, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlParam } from "@/lib/use-url-param"
import { LITURGICAL } from "@/lib/calendar"
import { lastSunday, longDate, money, relativeDay, shiftDays, today } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import type { Sermon, SermonSeries, SermonStats, GuestIndex } from "@/lib/types"
import { cn } from "@/lib/utils"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/sermons") || k.startsWith("/calendar")))

const nextSunday = () => {
  const s = lastSunday()
  return s === today() ? s : shiftDays(s, 7)
}

const shortDate = (iso: string) => new Date(`${iso}T00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })

export function SermonsContent() {
  const { can } = useAuth()
  const canManage = can("members.manage")
  const [tab, setTab] = useState<"rota" | "log" | "scripture" | "series">("rota")
  const [book, setBook] = useState<string>("all")
  const [seriesFilter, setSeriesFilter] = useState("all")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [viewId, setViewId] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ record?: Sermon; date?: string; service?: string; markPreached?: boolean } | null>(null)
  const [deleting, setDeleting] = useState<Sermon | null>(null)

  useUrlParam("open", setViewId)
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])
  useEffect(() => setPage(1), [search, book, seriesFilter, tab])

  const year = new Date().getFullYear()
  const { data: stats } = useApi<SermonStats>(qs("/sermons/stats", { year }))
  const { data: series = [] } = useApi<SermonSeries[]>("/sermons/series")
  const { rows: rota, isLoading: rotaLoading } = usePaginated<Sermon>(qs("/sermons", { status: "planned", perPage: 50 }))
  const { rows: log, meta, isLoading } = usePaginated<Sermon>(
    tab === "log" ? qs("/sermons", { status: "preached", search, book: book === "all" ? undefined : book, seriesId: seriesFilter, page, perPage: 20 }) : null,
  )

  const upcoming = rota.filter((s) => s.date >= today())
  const overdue = rota.filter((s) => s.date < today())

  return (
    <Page>
      <PageHeader
        eyebrow="Office"
        title="Sermons"
        description="Who preaches when, on what and from which passages: the preaching rota ahead and the service register behind."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/sermons/print?date=${nextSunday()}`} target="_blank"><Printer className="size-4" /> Sunday programme</Link>
            </Button>
            {canManage && <Button onClick={() => setEditing({ date: nextSunday() })}><Plus className="size-4" /> Plan preaching</Button>}
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Sermons in ${year}`} icon={Mic} value={stats?.preached.toLocaleString()} />
        <StatCard label="Preachers" icon={Users} tone="info" value={stats?.preachers.toLocaleString()} hint="Different people this year" />
        <StatCard label="Planned ahead" icon={CalendarClock} tone="success" value={stats?.upcoming.toLocaleString()} />
        <StatCard label="Unassigned services" icon={AlertTriangle} tone={stats?.gaps.length ? "gold" : "success"} value={stats?.gaps.length.toLocaleString()} hint="Sundays in the next 4 weeks" />
      </section>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="gap-4">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="rota"><CalendarClock className="size-4" /> Rota</TabsTrigger>
          <TabsTrigger value="log"><Mic className="size-4" /> Sermon log</TabsTrigger>
          <TabsTrigger value="scripture"><BookOpen className="size-4" /> Scripture</TabsTrigger>
          <TabsTrigger value="series"><Library className="size-4" /> Series</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------------- Rota */}
        <TabsContent value="rota" className="space-y-5">
          {!!stats?.gaps.length && (
            <Card className="gap-0 border-gold/40 bg-gold/5 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><AlertTriangle className="size-5 text-gold-foreground dark:text-gold" /> Nobody preaching yet</h2>
              <div className="flex flex-wrap gap-2">
                {stats.gaps.map((g) => (
                  <button key={`${g.date}-${g.service}`} type="button" disabled={!canManage}
                    onClick={() => setEditing({ date: g.date, service: g.service })}
                    className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm transition hover:border-primary/40">
                    <span className="font-semibold">{shortDate(g.date)}</span>
                    <span className="text-muted-foreground">{g.service}</span>
                    {canManage && <Plus className="size-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {overdue.length > 0 && (
            <Card className="gap-2 border-warning/30 p-5">
              <p className="text-sm font-semibold">Still marked as planned (date has passed). Record what was preached:</p>
              <ul className="space-y-1.5">
                {overdue.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>{shortDate(s.date)} · {s.service} · {s.preacher}</span>
                    {canManage && <Button size="sm" variant="outline" onClick={() => setEditing({ record: s, markPreached: true })}><ClipboardCheck className="size-4" /> Record</Button>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {rotaLoading ? <div className="h-48 animate-pulse rounded-2xl bg-muted" /> : upcoming.length === 0 ? (
            <Card className="py-0"><EmptyState icon={CalendarClock} title="Nothing planned yet" description="Plan who preaches at each service; they get a reminder a few days before (switch it on under Reminders)." /></Card>
          ) : (
            <div className="space-y-3">
              {upcoming.map((s) => (
                <Card key={s.id} className="cursor-pointer flex-row items-center gap-4 p-4 transition hover:border-primary/30" onClick={() => setViewId(s.id)}>
                  <DateTile iso={s.date} colour={s.season?.colour} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.service ?? "Service"} · {relativeDay(s.date)}</p>
                    <p className="mt-0.5 font-semibold">{s.theme ?? s.title ?? "Theme to be confirmed"}</p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><Mic className="size-3.5" />{s.preacher}{s.visiting && s.preacherChurch ? ` (${s.preacherChurch})` : ""}</span>
                      {s.series && <span>Series: {s.series}</span>}
                    </p>
                    {s.scriptures.length > 0 && <Passages refs={s.scriptures} className="mt-2" />}
                  </div>
                  {canManage && <RowMenu s={s} onEdit={() => setEditing({ record: s })} onPreached={() => setEditing({ record: s, markPreached: true })} onDelete={() => setDeleting(s)} />}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------------------------------------------------------- Log */}
        <TabsContent value="log">
          <TableCard
            title="Service register"
            count={meta?.total}
            actions={
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <div className="relative sm:w-64">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Theme, title, preacher, passage…" className="h-9 pl-9" />
                </div>
                <Select value={seriesFilter} onValueChange={setSeriesFilter}>
                  <SelectTrigger size="sm" className="sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All series</SelectItem>{series.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
                </Select>
                {book !== "all" && (
                  <Button size="sm" variant="outline" className="h-9" onClick={() => setBook("all")}>
                    {stats?.coverage[Number(book)]?.book} ×
                  </Button>
                )}
              </div>
            }
            footer={meta && meta.total > 0 && <Pager meta={meta} onPage={setPage} />}
          >
            {isLoading && !meta ? <TableSkeleton /> : log.length === 0 ? (
              <EmptyState icon={Mic} title="No sermons match" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Sermon</TableHead>
                    <TableHead className="hidden lg:table-cell">Passages</TableHead>
                    <TableHead className="hidden md:table-cell">Preacher</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer" onClick={() => setViewId(s.id)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {s.season && <span className="h-8 w-1 rounded-full" style={{ background: LITURGICAL[s.season.colour].bg }} title={s.season.name} />}
                          <div><p className="text-sm font-medium">{shortDate(s.date)}</p><p className="text-xs text-muted-foreground">{s.service}</p></div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <p className="font-semibold">{s.title ?? s.theme ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{[s.title && s.theme, s.series].filter(Boolean).join(" · ")}</p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell"><Passages refs={s.scriptures} /></TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2"><PersonAvatar name={s.preacher} className="size-7 text-[10px]" /><span className="text-sm">{s.preacher}</span></div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {canManage && <RowMenu s={s} onEdit={() => setEditing({ record: s })} onDelete={() => setDeleting(s)} />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableCard>
        </TabsContent>

        {/* ---------------------------------------------------------------- Scripture coverage */}
        <TabsContent value="scripture">
          <Card className="gap-5 p-5">
            <div>
              <h2 className="text-lg font-semibold">What has been preached in {year}</h2>
              <p className="text-sm text-muted-foreground">Darker means more sermons from that book. Click a book to see those sermons.</p>
            </div>
            {(["OT", "NT"] as const).map((t) => {
              const books = stats?.coverage.filter((b) => b.testament === t) ?? []
              const top = Math.max(1, ...books.map((b) => b.count))
              return (
                <section key={t}>
                  <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {t === "OT" ? "Old Testament" : "New Testament"} · {books.filter((b) => b.count).length} of {books.length} books
                  </h3>
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:grid-cols-9 xl:grid-cols-[repeat(13,minmax(0,1fr))]">
                    {books.map((b) => (
                      <button key={b.index} type="button" onClick={() => { setBook(String(b.index)); setTab("log") }} disabled={!b.count}
                        title={`${b.book}: ${b.count} sermon${b.count === 1 ? "" : "s"}`}
                        className={cn("rounded-lg border px-2 py-2 text-left text-xs transition", b.count ? "hover:ring-2 hover:ring-primary/30" : "cursor-default text-muted-foreground")}
                        style={b.count ? { background: `color-mix(in oklch, var(--primary) ${Math.round(12 + (b.count / top) * 60)}%, transparent)`, color: b.count / top > 0.5 ? "var(--primary-foreground)" : undefined } : undefined}>
                        <span className="block truncate font-semibold">{b.book}</span>
                        <span className="tabular opacity-80">{b.count || "—"}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )
            })}
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------------- Series */}
        <TabsContent value="series">
          <SeriesTab series={series} canManage={canManage} onOpen={(id) => { setSeriesFilter(id); setTab("log") }} />
        </TabsContent>
      </Tabs>

      {editing && <SermonDialog {...editing} series={series} onClose={() => setEditing(null)} />}
      {viewId && <SermonView id={viewId} canManage={canManage} onClose={() => setViewId(null)} onEdit={(s) => { setViewId(null); setEditing({ record: s }) }} />}
      {deleting && (
        <ConfirmDialog open onOpenChange={(o) => !o && setDeleting(null)} title="Delete sermon record"
          description={`Delete ${deleting.preacher}'s ${deleting.status === "planned" ? "planned " : ""}sermon on ${longDate(deleting.date)}?`}
          onConfirm={async () => { const ok = await runAction(() => del(`/sermons/${deleting.id}`), "Deleted"); if (ok) refresh(); return ok }} />
      )}
    </Page>
  )
}

function DateTile({ iso, colour }: { iso: string; colour?: keyof typeof LITURGICAL }) {
  const d = new Date(`${iso}T00:00`)
  return (
    <div className="relative flex w-16 shrink-0 flex-col items-center overflow-hidden rounded-xl border bg-secondary/50 py-2">
      {colour && <span className="absolute inset-x-0 top-0 h-1" style={{ background: LITURGICAL[colour].bg }} />}
      <span className="text-[10px] font-semibold uppercase text-muted-foreground">{d.toLocaleDateString(undefined, { month: "short" })}</span>
      <span className="text-2xl font-semibold leading-none tabular">{d.getDate()}</span>
      <span className="text-[10px] text-muted-foreground">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
    </div>
  )
}

function Passages({ refs, className }: { refs: string[]; className?: string }) {
  if (!refs.length) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {refs.map((r, i) => (
        <span key={r} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", i === 0 ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground")}>
          {i === 0 && <BookOpen className="size-3" />}{r}
        </span>
      ))}
    </div>
  )
}

function RowMenu({ s, onEdit, onPreached, onDelete }: { s: Sermon; onEdit: () => void; onPreached?: () => void; onDelete: () => void }) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {s.status === "planned" && onPreached && <DropdownMenuItem onClick={onPreached}><CheckCircle2 className="size-4" /> Record as preached</DropdownMenuItem>}
          <DropdownMenuItem onClick={onEdit}><Pencil className="size-4" /> Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function SermonView({ id, canManage, onClose, onEdit }: { id: string; canManage: boolean; onClose: () => void; onEdit: (s: Sermon) => void }) {
  const { data: s } = useApi<Sermon>(`/sermons/${id}`)
  const { churchName } = useSettings()
  const sms = s && `${churchName}: ${s.status === "planned" ? "This Sunday" : "Today's"} message${s.title ? ` "${s.title}"` : s.theme ? ` on ${s.theme}` : ""}${s.scriptures[0] ? ` from ${s.scriptures[0]}` : ""}${s.preacher ? `, by ${s.preacher}` : ""}. God bless you!`
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        {!s ? (<><DialogTitle className="sr-only">Loading</DialogTitle><div className="h-48 animate-pulse rounded-xl bg-muted" /></>) : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={s.status === "preached" ? "success" : "info"}>{s.status === "preached" ? "Preached" : "Planned"}</Badge>
                {s.season && <Badge variant="outline"><span className="size-2 rounded-full" style={{ background: LITURGICAL[s.season.colour].bg }} />{s.season.name}</Badge>}
                {s.series && <Badge variant="gold">{s.series}</Badge>}
              </div>
              <DialogTitle className="text-2xl">{s.title ?? s.theme ?? "Sermon"}</DialogTitle>
              <DialogDescription>{longDate(s.date)}{s.service ? ` · ${s.service}` : ""}{s.title && s.theme ? ` · ${s.theme}` : ""}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <PersonAvatar name={s.preacher} />
              <div className="flex-1"><p className="font-semibold">{s.preacher}</p><p className="text-xs text-muted-foreground">{s.visiting ? `Visiting preacher${s.preacherChurch ? ` · ${s.preacherChurch}` : ""}` : "Preacher"}</p></div>
              {s.preacherPhone && <Button size="sm" variant="outline" asChild><a href={`tel:${s.preacherPhone}`}>Call</a></Button>}
            </div>
            {(s.readings?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Readings</p>
                <ol className="divide-y rounded-xl border text-sm">
                  {s.readings!.map((r) => (
                    <li key={r.role} className="flex items-center gap-3 px-3 py-2">
                      <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">{r.label}</span>
                      <span className="flex-1 font-medium">{r.ref}</span>
                      {r.reader && <span className="text-xs text-muted-foreground">read by {r.reader}</span>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {s.scriptures.length > 0 && <div><p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sermon text</p><Passages refs={s.scriptures} /></div>}
            {s.notes && <div><p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p><p className="whitespace-pre-line text-sm">{s.notes}</p></div>}
            <Attachments type="sermon" id={s.id} canEdit={canManage} title="Sermon documents" suggestions={["Sermon notes", "Outline", "Slides", "Order of service"]} />
            {(s.attendance || s.offertory) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="size-3.5" /> Attendance</p><p className="text-lg font-semibold tabular">{s.attendance ?? "—"}</p></div>
                <div className="rounded-xl border p-3"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Coins className="size-3.5" /> Offertory</p><p className="text-lg font-semibold tabular">{s.offertory ? money(s.offertory) : "—"}</p></div>
              </div>
            )}
            <DialogFooter className="flex-wrap gap-2">
              {s.recordingUrl && <Button variant="outline" asChild className="mr-auto"><a href={s.recordingUrl} target="_blank" rel="noreferrer"><PlayCircle className="size-4" /> Recording</a></Button>}
              <Button variant="outline" asChild><Link href={`/sms?message=${encodeURIComponent(sms ?? "")}`}><MessageSquareText className="size-4" /> Share by SMS</Link></Button>
              {canManage && <Button onClick={() => onEdit(s)}><Pencil className="size-4" /> Edit</Button>}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SermonDialog({ record, date, service, markPreached, series, onClose }: { record?: Sermon; date?: string; service?: string; markPreached?: boolean; series: SermonSeries[]; onClose: () => void }) {
  const { services } = useSettings()
  const [status, setStatus] = useState<"planned" | "preached">(markPreached ? "preached" : (record?.status ?? ((date ?? today()) < today() ? "preached" : "planned")))
  const [svc, setSvc] = useState(record?.service ?? service ?? services[1] ?? services[0] ?? "")
  const [seriesId, setSeriesId] = useState(record?.seriesId ?? "none")
  const [newSeries, setNewSeries] = useState("")
  const [refs, setRefs] = useState<string[]>(record?.scriptures ?? [])
  const [visitingChurch, setVisitingChurch] = useState(record?.preacherChurch ?? "")
  const [readings, setReadings] = useState<ReadingDraft[]>([])
  const [preacherKind, setPreacherKind] = useState<"member" | "guest">(record?.preacherGuestId ? "guest" : "member")
  const [guestId, setGuestId] = useState(record?.preacherGuestId ?? "")
  const { data: guestIndex } = useApi<GuestIndex>(preacherKind === "guest" ? "/guests" : null)

  const { handleSubmit, pending, error } = useApiForm(async (fd) => {
    let sid = seriesId === "none" || seriesId === "new" ? null : Number(seriesId)
    if (seriesId === "new" && newSeries.trim()) {
      const r = await post<{ data: { id: string } }>("/sermons/series", { name: newSeries.trim() })
      sid = Number(r.data.id)
    }
    const memberId = preacherKind === "member" ? str(fd, "preacherMemberId") : null
    const guest = preacherKind === "guest" && guestId ? Number(guestId) : null
    const body = {
      date: str(fd, "date"), service: svc || null, status,
      preacherMemberId: memberId ? Number(memberId) : null, preacherGuestId: guest,
      preacherName: memberId || guest ? null : str(fd, "preacherName"),
      preacherChurch: memberId || guest ? null : visitingChurch || null,
      readings: readingsPayload(readings.length ? readings : (record?.readings ?? []).map((r) => ({ role: r.role, ref: r.ref, readerMemberId: r.readerMemberId, readerName: r.reader ?? "" })), fd),
      title: str(fd, "title"), theme: str(fd, "theme"), seriesId: sid, scriptures: refs,
      notes: str(fd, "notes"), recordingUrl: str(fd, "recordingUrl"),
    }
    if (record) await patch(`/sermons/${record.id}`, body)
    else await post("/sermons", body)
    refresh()
    onClose()
  }, record ? (markPreached ? "Recorded as preached" : "Saved") : status === "planned" ? "Added to the rota" : "Sermon recorded")

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{markPreached ? "Record the sermon" : record ? "Edit sermon" : "Plan preaching"}</DialogTitle>
          <DialogDescription>{status === "planned" ? "The preacher gets a reminder a few days before, if the Preaching rota reminder is on." : "What was preached, from which passages, and any notes or recording."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-6">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="s-date">Date</Label><Input id="s-date" name="date" type="date" defaultValue={record?.date ?? date ?? nextSunday()} required /></div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="s-svc">Service</Label>
            <Select value={svc} onValueChange={setSvc}>
              <SelectTrigger id="s-svc" className="w-full"><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>{services.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="s-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger id="s-status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="planned">Planned (rota)</SelectItem><SelectItem value="preached">Preached</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-6">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="s-preacher">Preacher</Label>
              <div className="flex gap-1 rounded-lg bg-muted p-0.5 text-xs">
                {(["member", "guest"] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setPreacherKind(k)} className={cn("rounded-md px-2.5 py-1 font-medium", preacherKind === k ? "bg-card shadow-xs" : "text-muted-foreground")}>{k === "member" ? "Member / other" : "Guest minister"}</button>
                ))}
              </div>
            </div>
            {preacherKind === "member" ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <MemberPicker id="s-preacher" name="preacherMemberId" freeTextName="preacherName" placeholder="A member, or type a visiting preacher's name"
                    initial={record?.preacherMemberId ? { id: record.preacherMemberId, name: record.preacher } : null}
                    initialText={record?.visiting && !record.preacherGuestId ? record.preacher : undefined} />
                </div>
                <Input aria-label="Visiting preacher's church" value={visitingChurch} onChange={(e) => setVisitingChurch(e.target.value)} placeholder="If visiting: church / diocese" />
              </div>
            ) : (
              <Select value={guestId} onValueChange={(v) => v && setGuestId(v)}>
                <SelectTrigger id="s-preacher" className="w-full"><SelectValue placeholder={guestIndex?.guests.length === 0 ? "No guest ministers yet: add them under People → Guests & placements" : "Choose a guest minister"} /></SelectTrigger>
                <SelectContent>{(guestIndex?.guests ?? []).map((g) => <SelectItem key={g.id} value={g.id}>{g.fullName}{g.churchName ? ` · ${g.churchName}` : ""}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2 sm:col-span-3"><Label htmlFor="s-theme">Theme</Label><Input id="s-theme" name="theme" defaultValue={record?.theme ?? ""} placeholder="e.g. Faith in hard times" /></div>
          <div className="space-y-2 sm:col-span-3"><Label htmlFor="s-title">Sermon title</Label><Input id="s-title" name="title" defaultValue={record?.title ?? ""} placeholder="e.g. Joy in trials" /></div>
          <div className="sm:col-span-6"><ReadingsEditor initial={record?.readings} onChange={setReadings} error={(k) => error?.field(k)} /></div>
          <div className="space-y-2 sm:col-span-6">
            <Label htmlFor="s-refs">Sermon text (passages preached from)</Label>
            <ScriptureInput id="s-refs" value={refs} onChange={setRefs} />
            <FieldError error={error} name="scriptures.0" />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="s-series">Series</Label>
            <Select value={seriesId} onValueChange={setSeriesId}>
              <SelectTrigger id="s-series" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not part of a series</SelectItem>
                {series.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                <SelectItem value="new">+ New series…</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {seriesId === "new" && <div className="space-y-2 sm:col-span-3"><Label htmlFor="s-newseries">New series name</Label><Input id="s-newseries" value={newSeries} onChange={(e) => setNewSeries(e.target.value)} required /></div>}
          {status === "preached" && (
            <>
              <div className="space-y-2 sm:col-span-6"><Label htmlFor="s-notes">Key points / notes</Label><Textarea id="s-notes" name="notes" rows={4} defaultValue={record?.notes ?? ""} /></div>
              <div className="space-y-2 sm:col-span-6"><Label htmlFor="s-rec">Recording link (YouTube, Facebook…)</Label><Input id="s-rec" name="recordingUrl" type="url" defaultValue={record?.recordingUrl ?? ""} placeholder="https://" /><FieldError error={error} name="recordingUrl" /></div>
            </>
          )}
          <DialogFooter className="sm:col-span-6">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : status === "planned" ? "Save to rota" : "Save sermon"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SeriesTab({ series, canManage, onOpen }: { series: SermonSeries[]; canManage: boolean; onOpen: (id: string) => void }) {
  const [adding, setAdding] = useState(false)
  const { handleSubmit, pending, error } = useApiForm(async (fd) => {
    await post("/sermons/series", { name: str(fd, "name"), description: str(fd, "description") })
    refresh()
    setAdding(false)
  }, "Series created")
  return (
    <div className="space-y-4">
      {canManage && <Button variant="outline" onClick={() => setAdding(true)}><Plus className="size-4" /> New series</Button>}
      {series.length === 0 ? <Card className="py-0"><EmptyState icon={Library} title="No series yet" description="Group a run of sermons, e.g. “Faith that works: James”." /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {series.map((x) => (
            <Card key={x.id} className="cursor-pointer gap-2 p-5 transition hover:border-primary/30" onClick={() => onOpen(x.id)}>
              <h3 className="text-lg font-semibold">{x.name}</h3>
              {x.description && <p className="text-sm text-muted-foreground">{x.description}</p>}
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${x.sermons ? (x.preached / x.sermons) * 100 : 0}%` }} /></div>
              <p className="text-xs text-muted-foreground">{x.preached} of {x.sermons} preached{x.from ? ` · ${shortDate(x.from)}${x.to && x.to !== x.from ? ` – ${shortDate(x.to)}` : ""}` : ""}</p>
            </Card>
          ))}
        </div>
      )}
      {adding && (
        <Dialog open onOpenChange={(o) => !o && setAdding(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>New series</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="ns-n">Name</Label><Input id="ns-n" name="name" required /><FieldError error={error} name="name" /></div>
              <div className="space-y-2"><Label htmlFor="ns-d">Description</Label><Textarea id="ns-d" name="description" rows={2} /></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" disabled={pending}>Create</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
