"use client"

import { useEffect, useState } from "react"
import { mutate } from "swr"
import { useRouter } from "next/navigation"
import { UserRoundPlus, Plus, Search, PhoneCall, Repeat, UserCheck, CalendarDays, Phone, MessageCircle, Home, Send, MoreHorizontal, Pencil, Trash2, HeartHandshake, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, PersonAvatar, StatCard, TableCard, TableSkeleton } from "@/components/page"
import { Pager } from "@/components/pager"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, runAction, str, useApiForm } from "@/components/form"
import { del, patch, post, qs, useApi, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlParam } from "@/lib/use-url-param"
import { humanize, longDate, relativeDay, today } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import type { Visitor, VisitorStats, VisitorStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { usePeriod } from "@/lib/period"
import { PeriodFilter, periodParams } from "@/components/period-filter"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/visitors") || k.startsWith("/members") || k === "/dashboard"))

const STATUS: Record<VisitorStatus, { label: string; variant: "warning" | "info" | "success" | "gold" | "muted" }> = {
  new: { label: "New", variant: "warning" },
  contacted: { label: "Contacted", variant: "info" },
  returning: { label: "Returning", variant: "success" },
  joined: { label: "Joined", variant: "gold" },
  lost: { label: "Not returning", variant: "muted" },
}
const STEPS = [
  { key: "welcomeSent", label: "Welcome message sent", icon: Send },
  { key: "called", label: "Called within 48 hours", icon: PhoneCall },
  { key: "visited", label: "Home visit", icon: Home },
  { key: "invitedBack", label: "Invited back / to a cell group", icon: HeartHandshake },
] as const
const TABS = { follow: "new,contacted", returning: "returning", joined: "joined", lost: "lost", all: "" } as const

export function VisitorsContent() {
  const { can } = useAuth()
  const canManage = can("members.manage")
  const [tab, setTab] = useState<keyof typeof TABS>("follow")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const period = usePeriod("all")
  useEffect(() => setPage(1), [period.range.from, period.range.to])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Visitor | null>(null)
  const [dialog, setDialog] = useState<"new" | "view" | "edit" | "delete" | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])
  useEffect(() => setPage(1), [tab, search])

  useUrlParam("open", (id) => {
    setSelectedId(id)
    setDialog("view")
  })

  const { data: stats } = useApi<VisitorStats>("/visitors/stats")
  const { rows, meta, isLoading } = usePaginated<Visitor>(qs("/visitors", { status: TABS[tab], search, ...periodParams(period), page, perPage: 20 }))

  return (
    <Page>
      <PageHeader
        eyebrow="Congregation"
        title="Visitors"
        description="Welcome first-time guests and follow up until they feel at home. Call within 48 hours."
        actions={canManage && <Button onClick={() => setDialog("new")}><Plus className="size-4" /> Add visitor</Button>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visitors (30 days)" icon={UserRoundPlus} value={stats?.last30Days.toLocaleString()} />
        <StatCard label="Waiting for a call" icon={PhoneCall} tone={stats?.needsCall ? "danger" : "success"} value={stats?.needsCall.toLocaleString()} hint="New for 2+ days, not yet called" />
        <StatCard label="Coming back" icon={Repeat} tone="info" value={stats?.byStatus.returning.toLocaleString()} />
        <StatCard label="Joined this year" icon={UserCheck} tone="gold" value={stats?.joinedThisYear.toLocaleString()} />
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="follow">To follow up{stats ? <span className="tabular text-muted-foreground">{stats.byStatus.new + stats.byStatus.contacted}</span> : null}</TabsTrigger>
          <TabsTrigger value="returning">Returning</TabsTrigger>
          <TabsTrigger value="joined">Joined</TabsTrigger>
          <TabsTrigger value="lost">Not returning</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
      <PeriodFilter period={period} allowAll label="First visit" />
      </div>

      <TableCard
        title="Guests"
        count={meta?.total}
        actions={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Name, phone or village…" className="h-9 pl-9" />
          </div>
        }
        footer={meta && meta.total > 0 && <Pager meta={meta} onPage={setPage} />}
      >
        {isLoading && !meta ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={UserRoundPlus} title={tab === "follow" ? "Everyone has been followed up" : "No visitors here"} description="Add first-time guests from the visitor cards collected at each service." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visitor</TableHead>
                <TableHead className="hidden md:table-cell">First visit</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v) => {
                const done = STEPS.filter((s) => v[s.key]).length
                return (
                  <TableRow key={v.id} className="cursor-pointer" onClick={() => (setSelectedId(v.id), setDialog("view"))}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <PersonAvatar name={v.name} />
                        <div>
                          <p className="font-semibold">{v.name}</p>
                          <p className="text-xs text-muted-foreground">{[v.phone, v.village].filter(Boolean).join(" · ") || "No contact"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm">{longDate(v.firstVisit)}</p>
                      <p className="text-xs text-muted-foreground">{relativeDay(v.firstVisit)}{v.service ? ` · ${v.service}` : ""}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" title={STEPS.map((s) => `${v[s.key] ? "✓" : "○"} ${s.label}`).join("\n")}>
                        {STEPS.map((s) => (
                          <span key={s.key} className={cn("flex size-6 items-center justify-center rounded-full", v[s.key] ? "bg-success/15 text-success" : "bg-muted text-muted-foreground/50")}>
                            <s.icon className="size-3" />
                          </span>
                        ))}
                        <span className="ml-1 text-xs text-muted-foreground tabular">{done}/4</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={STATUS[v.status].variant}>{STATUS[v.status].label}</Badge></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => (setEditing(v), setDialog("edit"))}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => (setEditing(v), setDialog("delete"))}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </TableCard>

      <VisitorDialog key="new" open={dialog === "new"} onOpenChange={(o) => !o && setDialog(null)} />
      {selectedId && <VisitorDetail id={selectedId} canManage={canManage} open={dialog === "view"} onOpenChange={(o) => !o && setDialog(null)} />}
      {editing && (
        <>
          <VisitorDialog key={`e-${editing.id}`} record={editing} open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} />
          <ConfirmDialog open={dialog === "delete"} onOpenChange={(o) => !o && setDialog(null)} title="Delete visitor"
            description={`Remove ${editing.name} and their follow-up history?`}
            onConfirm={async () => { const ok = await runAction(() => del(`/visitors/${editing.id}`), "Visitor removed"); if (ok) refresh(); return ok }} />
        </>
      )}
    </Page>
  )
}

function VisitorDetail({ id, canManage, open, onOpenChange }: { id: string; canManage: boolean; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter()
  const { data: v, mutate: reload } = useApi<Visitor>(open ? `/visitors/${id}` : null)
  const [gender, setGender] = useState<string>("")

  const log = useApiForm(async (fd) => {
    await post(`/visitors/${id}/follow-ups`, { method: str(fd, "method"), note: str(fd, "note"), date: str(fd, "date") })
    ;(document.getElementById("followup-form") as HTMLFormElement | null)?.reset()
    reload()
    refresh()
  }, "Follow-up logged")

  const toggle = async (key: (typeof STEPS)[number]["key"], value: boolean) => {
    if (await runAction(() => patch(`/visitors/${id}`, { [key]: value }), value ? "Step done" : "Step unticked")) (reload(), refresh())
  }
  const setStatus = async (status: VisitorStatus) => {
    if (await runAction(() => patch(`/visitors/${id}`, { status }), `Marked ${STATUS[status].label.toLowerCase()}`)) (reload(), refresh())
  }
  const convert = async () => {
    let memberId: string | null = null
    const ok = await runAction(async () => {
      const res = await post<{ data: { memberId: string; pledgeNumber: string } }>(`/visitors/${id}/convert`, v?.gender ? {} : { gender })
      memberId = res.data.memberId
    }, `${v?.name} is now a member`)
    if (ok) {
      refresh()
      onOpenChange(false)
      if (memberId) router.push("/members")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {!v ? (
          <>
            <DialogTitle className="sr-only">Loading</DialogTitle>
            <div className="h-60 animate-pulse rounded-xl bg-muted" />
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-4">
                <PersonAvatar name={v.name} className="size-14 text-lg" />
                <div className="min-w-0">
                  <DialogTitle className="text-2xl">{v.name}</DialogTitle>
                  <DialogDescription>
                    First came {longDate(v.firstVisit)} ({relativeDay(v.firstVisit).toLowerCase()}){v.service ? ` to the ${v.service}` : ""}
                    {v.howHeard ? ` · heard through ${v.howHeard.toLowerCase()}` : ""}
                  </DialogDescription>
                  <Badge variant={STATUS[v.status].variant} className="mt-2">{STATUS[v.status].label}</Badge>
                </div>
              </div>
            </DialogHeader>

            {v.phone && (
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" asChild><a href={`tel:${v.phone}`}><Phone className="size-4 text-primary" /> Call</a></Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://wa.me/${v.phone.replace(/\D/g, "").replace(/^0/, process.env.NEXT_PUBLIC_PHONE_COUNTRY_CODE ?? "256")}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-4 text-primary" /> WhatsApp
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild><a href={`sms:${v.phone}`}><Send className="size-4 text-primary" /> Text</a></Button>
              </div>
            )}

            {v.prayerRequest && (
              <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gold-foreground dark:text-gold">Prayer request</p>
                {v.prayerRequest}
              </div>
            )}

            <section>
              <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Follow-up checklist</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {STEPS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    disabled={!canManage}
                    onClick={() => toggle(s.key, !v[s.key])}
                    className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition", v[s.key] ? "border-success/30 bg-success/5" : "hover:bg-accent")}
                  >
                    <span className={cn("flex size-6 items-center justify-center rounded-full", v[s.key] ? "bg-success text-white" : "border")}>
                      {v[s.key] && <Check className="size-3.5" />}
                    </span>
                    <s.icon className="size-4 text-muted-foreground" />
                    {s.label}
                  </button>
                ))}
              </div>
            </section>

            {canManage && (
              <form id="followup-form" onSubmit={log.handleSubmit} className="space-y-2 rounded-xl border bg-secondary/30 p-4">
                <p className="text-sm font-semibold">Log a contact</p>
                <div className="grid gap-2 sm:grid-cols-[9rem_10rem_1fr_auto]">
                  <Select name="method" defaultValue="call">
                    <SelectTrigger className="w-full" aria-label="How"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["call", "whatsapp", "sms", "visit", "in_person"].map((m) => <SelectItem key={m} value={m}>{humanize(m)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input name="date" type="date" defaultValue={today()} max={today()} aria-label="Date" />
                  <Input name="note" placeholder="What happened?" aria-label="Note" />
                  <Button type="submit" disabled={log.pending}>Log</Button>
                </div>
                <FieldError error={log.error} name="date" />
              </form>
            )}

            <section>
              <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">History</h3>
              {v.followUps?.length ? (
                <ol className="space-y-2">
                  {v.followUps.map((f) => (
                    <li key={f.id} className="flex gap-3 rounded-xl border px-3 py-2.5 text-sm">
                      <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p><span className="font-semibold">{humanize(f.method)}</span> · {longDate(f.date)}{f.by ? ` · ${f.by}` : ""}</p>
                        {f.note && <p className="text-muted-foreground">{f.note}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No contact logged yet.</p>
              )}
            </section>

            {canManage && v.status !== "joined" && (
              <DialogFooter className="flex-wrap gap-2 border-t pt-4 sm:justify-between">
                <div className="flex gap-2">
                  {v.status !== "returning" && <Button variant="outline" size="sm" onClick={() => setStatus("returning")}>Came back</Button>}
                  {v.status !== "lost" && <Button variant="ghost" size="sm" onClick={() => setStatus("lost")}>Not returning</Button>}
                </div>
                <div className="flex gap-2">
                  {!v.gender && (
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger size="sm" className="w-28" aria-label="Gender"><SelectValue placeholder="Gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button size="sm" onClick={convert} disabled={!v.gender && !gender}>
                    <UserCheck className="size-4" /> Make member
                  </Button>
                </div>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function VisitorDialog({ record, open, onOpenChange }: { record?: Visitor; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { services } = useSettings()
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const body = {
      name: str(fd, "name"), phone: str(fd, "phone"), email: str(fd, "email"), gender: str(fd, "gender"),
      village: str(fd, "village"), firstVisit: str(fd, "firstVisit"), service: str(fd, "service"),
      howHeard: str(fd, "howHeard"), invitedBy: str(fd, "invitedBy"), prayerRequest: str(fd, "prayerRequest"), notes: str(fd, "notes"),
    }
    if (record) await patch(`/visitors/${record.id}`, body)
    else await post("/visitors", body)
    refresh()
    onOpenChange(false)
  }, record ? "Visitor updated" : "Visitor added")

  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{record ? `Edit ${record.name}` : "Add a visitor"}</DialogTitle>
          <DialogDescription>From the visitor card filled in at church.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="v-name">Full name</Label>
            <Input id="v-name" name="name" defaultValue={record?.name} required />
            <FieldError error={error} name="name" />
          </div>
          <div className="space-y-2"><Label htmlFor="v-phone">Phone</Label><Input id="v-phone" name="phone" type="tel" defaultValue={record?.phone ?? ""} /></div>
          <div className="space-y-2">
            <Label htmlFor="v-gender">Gender</Label>
            <Select name="gender" defaultValue={record?.gender ?? undefined}>
              <SelectTrigger id="v-gender" className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="v-village">Village</Label><Input id="v-village" name="village" defaultValue={record?.village ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="v-email">Email</Label><Input id="v-email" name="email" type="email" defaultValue={record?.email ?? ""} /><FieldError error={error} name="email" /></div>
          <div className="space-y-2"><Label htmlFor="v-date">First visit</Label><Input id="v-date" name="firstVisit" type="date" max={today()} defaultValue={record?.firstVisit ?? today()} required /></div>
          <div className="space-y-2">
            <Label htmlFor="v-svc">Service</Label>
            <Select name="service" defaultValue={record?.service ?? services[0]}>
              <SelectTrigger id="v-svc" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-how">How they heard</Label>
            <Select name="howHeard" defaultValue={record?.howHeard ?? undefined}>
              <SelectTrigger id="v-how" className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{["Friend", "Family", "Walked in", "Radio", "Social media", "Crusade", "Other"].map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="v-inv">Invited by</Label><Input id="v-inv" name="invitedBy" defaultValue={record?.invitedBy ?? ""} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="v-prayer">Prayer request</Label><Textarea id="v-prayer" name="prayerRequest" rows={2} defaultValue={record?.prayerRequest ?? ""} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="v-notes">Notes</Label><Textarea id="v-notes" name="notes" rows={2} defaultValue={record?.notes ?? ""} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save visitor"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
