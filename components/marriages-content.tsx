"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { mutate } from "swr"
import { Gem, Plus, Search, CalendarClock, ScrollText, BellRing, MoreHorizontal, Pencil, Trash2, CheckCircle2, Printer, Megaphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BannsTab, DayTab, MoneyTab, ReadinessTab, useWedding } from "@/components/wedding-tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, StatCard, TableCard, TableSkeleton } from "@/components/page"
import { Pager } from "@/components/pager"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, bool, runAction, str, useApiForm } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { del, patch, post, qs, useApi, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Attachments, useAttachmentImage } from "@/components/attachments"
import { useUrlParam } from "@/lib/use-url-param"
import { longDate, relativeDay, today } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import type { Marriage, MarriageStats } from "@/lib/types"
import { cn } from "@/lib/utils"
import { usePeriod } from "@/lib/period"
import { PeriodFilter, periodParams } from "@/components/period-filter"

const refresh = () => mutate((k) => typeof k === "string" && k.startsWith("/marriages"))

export function MarriagesContent() {
  const { can } = useAuth()
  const canManage = can("members.manage")
  const { denomination } = useSettings()
  const usesBanns = denomination !== "pentecostal"
  const [tab, setTab] = useState<"scheduled" | "completed">("scheduled")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const period = usePeriod("all")
  useEffect(() => setPage(1), [period.range.from, period.range.to])
  const [selected, setSelected] = useState<Marriage | null>(null)
  const [dialog, setDialog] = useState<"new" | "edit" | "delete" | null>(null)
  const [viewing, setViewing] = useState<Marriage | null>(null)
  useUrlParam("open", (id) => setViewing({ id } as Marriage))

  useUrlParam("tab", (t) => (t === "scheduled" || t === "completed") && setTab(t))
  useUrlParam("q", setSearchInput)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])
  useEffect(() => setPage(1), [tab, search])

  const { data: stats } = useApi<MarriageStats>("/marriages/stats")
  const { rows, meta, isLoading } = usePaginated<Marriage>(qs("/marriages", { status: tab, search, ...periodParams(period), page, perPage: 20 }))

  const update = async (m: Marriage, body: Partial<Marriage>, msg: string) => {
    if (await runAction(() => patch(`/marriages/${m.id}`, body), msg)) refresh()
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Congregation"
        title="Marriages"
        description={usesBanns ? "Weddings being prepared (banns and counselling) and the church's marriage register." : "Weddings being prepared and the church's marriage register."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link href="/marriages/register" target="_blank"><Printer className="size-4" /> Print register</Link></Button>
            {canManage && (
              <Button onClick={() => setDialog("new")}>
                <Plus className="size-4" /> Register a wedding
              </Button>
            )}
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Married in ${stats?.year ?? ""}`} icon={Gem} tone="gold" value={stats?.marriedThisYear.toLocaleString()} />
        <StatCard label="Weddings planned" icon={CalendarClock} value={stats?.planned.toLocaleString()} />
        {usesBanns && <StatCard label="Banns still to read" icon={BellRing} tone="info" value={stats?.bannsPending.toLocaleString()} hint="Read on 3 Sundays before the wedding" />}
        <StatCard label="In the register" icon={ScrollText} tone="success" value={stats?.totalRegistered.toLocaleString()} />
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="scheduled">Planned</TabsTrigger>
          <TabsTrigger value="completed">Register</TabsTrigger>
        </TabsList>
      </Tabs>
      <PeriodFilter period={period} allowAll label="Wedding date" />
      </div>

      <TableCard
        title={tab === "scheduled" ? "Weddings being prepared" : "Marriage register"}
        count={meta?.total}
        actions={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Groom, bride or certificate no…" className="h-9 pl-9" />
          </div>
        }
        footer={meta && meta.total > 0 && <Pager meta={meta} onPage={setPage} />}
      >
        {isLoading && !meta ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={Gem} title={tab === "scheduled" ? "No weddings planned" : "The register is empty"} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {tab === "completed" && <TableHead>Cert. no</TableHead>}
                <TableHead>Couple</TableHead>
                <TableHead>Date</TableHead>
                {tab === "scheduled" && usesBanns && <TableHead>Banns</TableHead>}
                {tab === "scheduled" && <TableHead className="hidden md:table-cell">Counselling</TableHead>}
                <TableHead className="hidden lg:table-cell">Officiant</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id} className="cursor-pointer" onClick={() => setViewing(m)}>
                  {tab === "completed" && <TableCell className="font-mono text-xs text-muted-foreground">{m.certificateNumber}</TableCell>}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-gold/15 text-gold-foreground dark:text-gold">
                        <Gem className="size-4" />
                      </span>
                      <div>
                        <p className="font-semibold">
                          {m.groomName} <span className="font-normal text-muted-foreground">&amp;</span> {m.brideName}
                        </p>
                        <p className="text-xs text-muted-foreground">{m.place ?? "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{longDate(m.date)}</p>
                    {tab === "scheduled" && <p className="text-xs text-muted-foreground">{relativeDay(m.date)}</p>}
                  </TableCell>
                  {tab === "scheduled" && usesBanns && (
                    <TableCell>
                      <div className="flex items-center gap-1.5" title={`${m.bannsRead} of 3 readings`}>
                        {[1, 2, 3].map((n) => (
                          <span key={n} className={cn("size-2.5 rounded-full", n <= m.bannsRead ? "bg-primary" : "bg-muted ring-1 ring-border")} />
                        ))}
                        <span className="ml-1 text-xs text-muted-foreground tabular">{m.bannsRead}/3</span>
                      </div>
                    </TableCell>
                  )}
                  {tab === "scheduled" && (
                    <TableCell className="hidden md:table-cell">
                      {m.counsellingDone ? <Badge variant="success">Done</Badge> : <Badge variant="warning">Pending</Badge>}
                    </TableCell>
                  )}
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{m.officiant ?? "—"}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Actions">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {m.status === "completed" && (
                          <DropdownMenuItem asChild>
                            <Link href={`/marriages/certificate?id=${m.id}`} target="_blank">
                              <Printer className="size-4" /> Print certificate
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {canManage && m.status === "scheduled" && usesBanns && m.bannsRead < 3 && (
                          <DropdownMenuItem onClick={() => update(m, { bannsRead: m.bannsRead + 1 }, `Banns reading ${m.bannsRead + 1} recorded`)}>
                            <Megaphone className="size-4" /> Banns read this Sunday
                          </DropdownMenuItem>
                        )}
                        {canManage && m.status === "scheduled" && (
                          <DropdownMenuItem onClick={() => update(m, { status: "completed" }, "Marriage added to the register")}>
                            <CheckCircle2 className="size-4" /> Mark solemnised
                          </DropdownMenuItem>
                        )}
                        {canManage && (
                          <>
                            <DropdownMenuItem onClick={() => (setSelected(m), setDialog("edit"))}>
                              <Pencil className="size-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => (setSelected(m), setDialog("delete"))}>
                              <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>

      {viewing && <MarriageView id={viewing.id} usesBanns={usesBanns} canManage={canManage} onClose={() => setViewing(null)}
        onEdit={(m) => (setViewing(null), setSelected(m), setDialog("edit"))} onUpdate={(m, body, msg) => update(m, body, msg)} />}
      <MarriageDialog key="new" open={dialog === "new"} onOpenChange={(o) => !o && setDialog(null)} usesBanns={usesBanns} />
      {selected && (
        <>
          <MarriageDialog key={`e-${selected.id}`} record={selected} open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} usesBanns={usesBanns} />
          <ConfirmDialog
            open={dialog === "delete"}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Delete marriage record"
            description={`Delete the record for ${selected.groomName} & ${selected.brideName}? This cannot be undone.`}
            onConfirm={async () => {
              const ok = await runAction(() => del(`/marriages/${selected.id}`), "Record deleted")
              if (ok) refresh()
              return ok
            }}
          />
        </>
      )}
    </Page>
  )
}

function MarriageDialog({ record, open, onOpenChange, usesBanns }: { record?: Marriage; open: boolean; onOpenChange: (o: boolean) => void; usesBanns: boolean }) {
  const { churchName } = useSettings()
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const groomId = str(fd, "groomMemberId")
    const brideId = str(fd, "brideMemberId")
    const body = {
      groomMemberId: groomId ? Number(groomId) : null,
      groomName: groomId ? null : str(fd, "groomName"),
      brideMemberId: brideId ? Number(brideId) : null,
      brideName: brideId ? null : str(fd, "brideName"),
      date: str(fd, "date"),
      status: str(fd, "status"),
      place: str(fd, "place"),
      officiant: str(fd, "officiant"),
      witnesses: str(fd, "witnesses"),
      bannsRead: Number(str(fd, "bannsRead") ?? 0),
      counsellingDone: bool(fd, "counsellingDone"),
      certificateNumber: str(fd, "certificateNumber"),
      notes: str(fd, "notes"),
    }
    if (record) await patch(`/marriages/${record.id}`, body)
    else await post("/marriages", body)
    refresh()
    onOpenChange(false)
  }, record ? "Record updated" : "Wedding registered")

  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{record ? "Edit marriage" : "Register a wedding"}</DialogTitle>
          <DialogDescription>Pick members of the church or type the names of partners from elsewhere.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="m-groom">Groom</Label>
            <MemberPicker id="m-groom" name="groomMemberId" freeTextName="groomName" placeholder="Member or full name"
              initial={record?.groomMemberId ? { id: record.groomMemberId, name: record.groomName } : null}
              initialText={record && !record.groomMemberId ? record.groomName : undefined} />
            <FieldError error={error} name="groomName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-bride">Bride</Label>
            <MemberPicker id="m-bride" name="brideMemberId" freeTextName="brideName" placeholder="Member or full name"
              initial={record?.brideMemberId ? { id: record.brideMemberId, name: record.brideName } : null}
              initialText={record && !record.brideMemberId ? record.brideName : undefined} />
            <FieldError error={error} name="brideName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-date">Wedding date</Label>
            <Input id="m-date" name="date" type="date" defaultValue={record?.date ?? today()} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-status">Status</Label>
            <Select name="status" defaultValue={record?.status ?? "scheduled"}>
              <SelectTrigger id="m-status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Planned</SelectItem>
                <SelectItem value="completed">Solemnised</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-place">Place</Label>
            <Input id="m-place" name="place" defaultValue={record?.place ?? churchName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-off">Officiating minister</Label>
            <Input id="m-off" name="officiant" defaultValue={record?.officiant ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="m-wit">Witnesses</Label>
            <Input id="m-wit" name="witnesses" defaultValue={record?.witnesses ?? ""} placeholder="Separate names with commas" />
          </div>
          {usesBanns ? (
            <div className="space-y-2">
              <Label htmlFor="m-banns">Banns read</Label>
              <Select name="bannsRead" defaultValue={String(record?.bannsRead ?? 0)}>
                <SelectTrigger id="m-banns" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n === 3 ? "All 3 Sundays" : `${n} of 3`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <input type="hidden" name="bannsRead" value={record?.bannsRead ?? 0} />
          )}
          <div className="flex items-center justify-between rounded-xl border bg-secondary/40 px-4 py-3">
            <Label htmlFor="m-couns">Pre-marital counselling done</Label>
            <Switch id="m-couns" name="counsellingDone" defaultChecked={record?.counsellingDone ?? false} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-cert">Certificate no.</Label>
            <Input id="m-cert" name="certificateNumber" placeholder="Issued automatically" defaultValue={record?.certificateNumber ?? ""} />
            <FieldError error={error} name="certificateNumber" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="m-notes">Notes</Label>
            <Textarea id="m-notes" name="notes" rows={2} defaultValue={record?.notes ?? ""} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : record ? "Save changes" : "Register wedding"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** One marriage: the couple, the banns, the day, the official photo and its documents. */
function MarriageView({ id, usesBanns, canManage, onClose, onEdit, onUpdate }: {
  id: string; usesBanns: boolean; canManage: boolean; onClose: () => void; onEdit: (m: Marriage) => void
  onUpdate: (m: Marriage, body: Record<string, unknown>, msg: string) => Promise<unknown> | void
}) {
  const { data: m, mutate: reload } = useApi<Marriage>(`/marriages/${id}`)
  const photo = useAttachmentImage("marriage", m ? m.id : null)
  const { data: w, refresh: refreshWedding } = useWedding(id)
  const refresh = () => (refreshWedding(), reload())
  const act = async (body: Record<string, unknown>, msg: string) => { if (m) { await onUpdate(m, body, msg); reload() } }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-3xl">
        {!m ? <><DialogTitle className="sr-only">Loading</DialogTitle><div className="m-6 h-60 animate-pulse rounded-xl bg-muted" /></> : (
          <>
            {photo ? (
              <div className="relative">
                <img src={photo} alt={`${m.groomName} and ${m.brideName}`} className="max-h-80 w-full rounded-t-lg object-cover" />
                <div className="absolute inset-x-0 bottom-0 rounded-b-none bg-gradient-to-t from-black/70 to-transparent p-5 pt-16 text-white">
                  <DialogTitle className="text-2xl font-semibold text-white">{m.groomName} &amp; {m.brideName}</DialogTitle>
                  <DialogDescription className="text-white/80">{longDate(m.date)}{m.place ? ` · ${m.place}` : ""}</DialogDescription>
                </div>
              </div>
            ) : (
              <DialogHeader className="min-w-0 border-b p-6 pb-4 pr-12 text-left">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-foreground dark:text-gold"><Gem className="size-5" /></span>
                  <div className="min-w-0">
                    <DialogTitle className="text-xl">{m.groomName} &amp; {m.brideName}</DialogTitle>
                    <DialogDescription>{longDate(m.date)}{m.place ? ` · ${m.place}` : ""}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            )}
            <Tabs defaultValue="overview" className="min-w-0 gap-0">
              <div className="min-w-0 overflow-x-auto border-b px-4 pt-3 sm:px-6">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  {usesBanns && <TabsTrigger value="banns">Banns</TabsTrigger>}
                  <TabsTrigger value="readiness">Readiness</TabsTrigger>
                  <TabsTrigger value="money">Money</TabsTrigger>
                  <TabsTrigger value="day">The day</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="overview" className="min-w-0 space-y-5 p-4 pt-4 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={m.status === "completed" ? "success" : "info"}>{m.status === "completed" ? "Solemnised" : "Being prepared"}</Badge>
                    {m.certificateNumber && <Badge variant="outline" className="font-mono">Register no. {m.certificateNumber}</Badge>}
                    {!photo && <span className="text-xs text-muted-foreground">Add the official wedding photo below and it shows here.</span>}
                  </div>
                  <div className="grid gap-4 text-sm sm:grid-cols-3">
                    {usesBanns && (
                      <div>
                        <p className="text-xs text-muted-foreground">Banns</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          {[1, 2, 3].map((n) => <span key={n} className={cn("size-3 rounded-full", n <= m.bannsRead ? "bg-primary" : "bg-muted ring-1 ring-border")} />)}
                          <span className="ml-1 font-medium tabular">{m.bannsRead} of 3 read</span>
                        </div>
                        {w?.nextBannsSunday && <p className="text-xs text-muted-foreground">Next: {longDate(w.nextBannsSunday)}</p>}
                      </div>
                    )}
                    <div><p className="text-xs text-muted-foreground">Readiness</p><p className="font-medium">{w ? (w.ready ? "All ready" : `${w.readyCount} of ${w.readiness.length} ready`) : "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Time</p><p className="font-medium">{m.time ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Officiating minister</p><p className="font-medium">{m.officiant ?? "—"}</p></div>
                    <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Witnesses</p><p className="font-medium">{m.witnesses ?? "—"}</p></div>
                  </div>
                  {m.notes && <p className="whitespace-pre-line rounded-xl bg-muted px-3 py-2 text-sm">{m.notes}</p>}
                  <Attachments type="marriage" id={m.id} canEdit={canManage} title="Wedding documents & photos"
                    hint="Banns read (signed), the official wedding photo, notice of marriage, counselling certificate, the signed register copy"
                    suggestions={["Official wedding photo", "Banns read", "Notice of marriage", "Counselling certificate", "Signed marriage certificate"]} />
              </TabsContent>
              {w && (
                <>
                  {usesBanns && <TabsContent value="banns" className="min-w-0 p-4 pt-4 sm:p-6"><BannsTab m={m} w={w} refresh={refresh} /></TabsContent>}
                  <TabsContent value="readiness" className="min-w-0 p-4 pt-4 sm:p-6"><ReadinessTab m={m} w={w} refresh={refresh} /></TabsContent>
                  <TabsContent value="money" className="min-w-0 p-4 pt-4 sm:p-6"><MoneyTab m={m} w={w} refresh={refresh} /></TabsContent>
                  <TabsContent value="day" className="min-w-0 p-4 pt-4 sm:p-6"><DayTab key={w.programme.length} m={m} w={w} refresh={refresh} /></TabsContent>
                </>
              )}
            </Tabs>
            <DialogFooter className="flex-wrap gap-2 border-t p-4">
              {canManage && m.status === "scheduled" && <Button variant="outline" onClick={() => act({ status: "completed" }, "Marriage added to the register").then(refresh)}><CheckCircle2 className="size-4" /> Mark solemnised</Button>}
              <Button variant="outline" asChild><Link href={`/marriages/certificate?id=${m.id}`} target="_blank"><Printer className="size-4" /> Certificate</Link></Button>
              {canManage && <Button onClick={() => onEdit(m)}><Pencil className="size-4" /> Edit</Button>}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
