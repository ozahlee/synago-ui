"use client"

import { useState, useEffect } from "react"
import { mutate } from "swr"
import { HeartPulse, Plus, Cross, HeartCrack, Hospital, Baby, Stethoscope, CircleHelp, Footprints, CalendarClock, MoreHorizontal, Pencil, Trash2, CheckCircle2, MapPin, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, PersonAvatar, StatCard } from "@/components/page"
import { Pager } from "@/components/pager"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, num, runAction, str, useApiForm } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { del, patch, post, qs, useApi, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { CURRENCY, humanize, longDate, money, relativeDay, today } from "@/lib/format"
import { CARE_TYPES, VISIT_TYPES, type CareCase, type CareStats, type CareType, type PastoralVisit } from "@/lib/types"
import { cn } from "@/lib/utils"
import { usePeriod } from "@/lib/period"
import { PeriodFilter, periodParams } from "@/components/period-filter"
import { useUrlParam } from "@/lib/use-url-param"

export const refreshCare = () => mutate((k) => typeof k === "string" && (k.startsWith("/care") || k.startsWith("/members") || k.startsWith("/welfare") || k.startsWith("/announcements")))

const CASE_META: Record<CareType, { label: string; icon: typeof Cross; tone: string }> = {
  member_death: { label: "Member died", icon: Cross, tone: "bg-foreground text-background" },
  bereavement: { label: "Bereavement", icon: HeartCrack, tone: "bg-muted text-foreground" },
  sickness: { label: "Sickness", icon: Stethoscope, tone: "bg-warning/15 text-warning" },
  hospital: { label: "In hospital", icon: Hospital, tone: "bg-destructive/10 text-destructive" },
  newborn: { label: "Newborn", icon: Baby, tone: "bg-success/10 text-success" },
  other: { label: "Other", icon: CircleHelp, tone: "bg-secondary text-muted-foreground" },
}

export function CareContent() {
  const { can } = useAuth()
  const canManage = can("members.manage")
  const [status, setStatus] = useState("open")
  const [page, setPage] = useState(1)
  const [vpage, setVpage] = useState(1)
  const [tab, setTab] = useState("cases")
  useUrlParam("tab", (t) => (t === "cases" || t === "visits") && setTab(t))
  const [selected, setSelected] = useState<CareCase | null>(null)
  const [dialog, setDialog] = useState<"case" | "edit" | "visit" | "delete" | null>(null)
  const [visitFor, setVisitFor] = useState<CareCase | null>(null)

  const { data: stats } = useApi<CareStats>("/care/stats")
  const period = usePeriod("all")
  useEffect(() => (setPage(1), setVpage(1)), [period.range.from, period.range.to])
  const { rows: cases, meta, isLoading } = usePaginated<CareCase>(qs("/care/cases", { status: status === "all" ? undefined : status, ...periodParams(period), page, perPage: 12 }))
  const { rows: visits, meta: vmeta } = usePaginated<PastoralVisit>(qs("/care/visits", { ...periodParams(period), page: vpage, perPage: 15 }))
  const { rows: due } = usePaginated<PastoralVisit>(qs("/care/visits", { followUps: 1, perPage: 50 }))
  const dueSoon = due.filter((v) => v.followUpOn && v.followUpOn <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10))

  return (
    <Page>
      <PageHeader
        eyebrow="Congregation"
        title="Pastoral care"
        description="Bereavements, sickness and new babies, and the visits that care for people. To record a member's death, open their profile and choose “Record death”."
        actions={canManage && (
          <>
            <Button variant="outline" onClick={() => (setVisitFor(null), setDialog("visit"))}><Footprints className="size-4" /> Log a visit</Button>
            <Button onClick={() => setDialog("case")}><Plus className="size-4" /> New case</Button>
          </>
        )}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open cases" icon={HeartPulse} value={stats?.openCases.toLocaleString()} />
        <StatCard label="Follow-ups this week" icon={CalendarClock} tone={stats?.followUpsDue ? "gold" : "success"} value={stats?.followUpsDue.toLocaleString()} />
        <StatCard label="Visits this month" icon={Footprints} tone="info" value={stats?.visitsThisMonth.toLocaleString()} />
        <StatCard label="Members who died this year" icon={Cross} tone="neutral" value={stats?.deathsThisYear.toLocaleString()} />
      </section>

      {dueSoon.length > 0 && (
        <Card className="gap-0 border-gold/40 bg-gold/5 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><CalendarClock className="size-5 text-gold-foreground dark:text-gold" /> Follow-up visits due</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {dueSoon.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
                <PersonAvatar name={v.visitee} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{v.visitee}</p>
                  <p className="text-xs text-muted-foreground">{humanize(v.type)} visit · last {longDate(v.date)}</p>
                </div>
                <Badge variant={v.followUpOn! < today() ? "danger" : "warning"}>{relativeDay(v.followUpOn!)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <TabsList>
            <TabsTrigger value="cases">Cases</TabsTrigger>
            <TabsTrigger value="visits">Visit log</TabsTrigger>
          </TabsList>
          <PeriodFilter period={period} allowAll />
        </div>

        <TabsContent value="cases" className="space-y-4">
          <Select value={status} onValueChange={(v) => (setStatus(v), setPage(1))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="all">All</SelectItem></SelectContent>
          </Select>
          {isLoading && !meta ? <div className="h-40 animate-pulse rounded-2xl bg-muted" /> : cases.length === 0 ? (
            <Card className="py-0"><EmptyState icon={HeartPulse} title="No cases" description="Record a bereavement, sickness or new baby to coordinate care." /></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {cases.map((c) => {
                const M = CASE_META[c.type]
                return (
                  <Card key={c.id} className={cn("gap-0 p-5", c.status === "closed" && "opacity-70")}>
                    <div className="flex items-start gap-3">
                      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", M.tone)}><M.icon className="size-5" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{M.label}</Badge>
                          {c.status === "closed" && <Badge variant="muted">Closed</Badge>}
                          {c.welfareStatus && <Badge variant="info">Welfare: {c.welfareStatus}</Badge>}
                        </div>
                        <h3 className="mt-1.5 font-semibold leading-snug">
                          {c.type === "member_death" ? `The late ${c.memberName}` : c.type === "bereavement" ? `${c.memberName}'s ${c.relationship?.toLowerCase() ?? "relative"}: ${c.subject}` : (c.subject ?? c.memberName)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {longDate(c.date)}{c.type === "bereavement" && c.memberName ? ` · family: ${c.memberName}` : ""}
                        </p>
                      </div>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => (setVisitFor(c), setDialog("visit"))}><Footprints className="size-4" /> Log a visit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => (setSelected(c), setDialog("edit"))}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                            {c.status === "open" && (
                              <DropdownMenuItem onClick={async () => { if (await runAction(() => patch(`/care/cases/${c.id}`, { status: "closed" }), "Case closed")) refreshCare() }}>
                                <CheckCircle2 className="size-4" /> Close case
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => (setSelected(c), setDialog("delete"))}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {(c.burialDate || c.burialPlace) && (
                      <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-secondary/60 px-3 py-2 text-sm">
                        <MapPin className="size-4 text-muted-foreground" /> Burial {c.burialDate ? longDate(c.burialDate) : ""}{c.burialPlace ? ` at ${c.burialPlace}` : ""}
                      </p>
                    )}
                    {c.notes && <p className="mt-3 text-sm text-muted-foreground">{c.notes}</p>}
                    <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">{c.visits} visit{c.visits === 1 ? "" : "s"} logged</p>
                  </Card>
                )
              })}
            </div>
          )}
          <Pager meta={meta} onPage={setPage} />
        </TabsContent>

        <TabsContent value="visits">
          <Card className="gap-0 py-0">
            <ul className="divide-y">
              {visits.map((v) => (
                <li key={v.id} className="flex items-start gap-3 px-6 py-3.5">
                  <PersonAvatar name={v.visitee} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm"><span className="font-semibold">{v.visitee}</span> <span className="text-muted-foreground">· {humanize(v.type)} visit · {longDate(v.date)}{v.place ? ` · ${v.place}` : ""}</span></p>
                    {v.notes && <p className="text-sm text-muted-foreground">{v.notes}</p>}
                    <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                      {v.team && <span className="inline-flex items-center gap-1"><Users className="size-3" />{v.team}</span>}
                      {v.giftAmount ? <span>Gift {money(v.giftAmount)}</span> : null}
                      {v.followUpOn && <span>Follow up {longDate(v.followUpOn)}</span>}
                    </p>
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="icon-sm" aria-label="Delete visit" onClick={async () => { if (await runAction(() => del(`/care/visits/${v.id}`), "Visit removed")) refreshCare() }}>
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
              {visits.length === 0 && <li className="p-6"><EmptyState icon={Footprints} title="No visits logged yet" className="py-6" /></li>}
            </ul>
            {vmeta && vmeta.total > 0 && <div className="border-t bg-secondary/40 px-6 py-3"><Pager meta={vmeta} onPage={setVpage} /></div>}
          </Card>
        </TabsContent>
      </Tabs>

      <CaseDialog key="new" open={dialog === "case"} onOpenChange={(o) => !o && setDialog(null)} />
      <VisitDialog key={`v-${visitFor?.id ?? "free"}`} forCase={visitFor} open={dialog === "visit"} onOpenChange={(o) => !o && setDialog(null)} />
      {selected && (
        <>
          <CaseDialog key={`e-${selected.id}`} record={selected} open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} />
          <ConfirmDialog open={dialog === "delete"} onOpenChange={(o) => !o && setDialog(null)} title="Delete case" description="Delete this care case? Logged visits are kept."
            onConfirm={async () => { const ok = await runAction(() => del(`/care/cases/${selected.id}`), "Case deleted"); if (ok) refreshCare(); return ok }} />
        </>
      )}
    </Page>
  )
}

function CaseDialog({ record, open, onOpenChange }: { record?: CareCase; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [type, setType] = useState<CareType>(record?.type === "member_death" ? "member_death" : (record?.type ?? "bereavement"))
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const memberId = str(fd, "memberId")
    const body = { type, memberId: memberId ? Number(memberId) : null, subject: str(fd, "subject"), relationship: str(fd, "relationship"),
      date: str(fd, "date"), burialDate: str(fd, "burialDate"), burialPlace: str(fd, "burialPlace"), notes: str(fd, "notes") }
    if (record) await patch(`/care/cases/${record.id}`, body)
    else await post("/care/cases", body)
    refreshCare()
    onOpenChange(false)
  }, record ? "Case updated" : "Case opened")
  const isLoss = type === "bereavement" || type === "member_death"

  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{record ? "Edit case" : "New care case"}</DialogTitle>
          <DialogDescription>For a member who has died, use “Record death” on their profile instead: it also handles the announcement, welfare and SMS.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {type !== "member_death" && (
            <div className="space-y-2 sm:col-span-2">
              <Label>What happened</Label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {CARE_TYPES.filter((t) => t !== "member_death").map((t) => {
                  const M = CASE_META[t]
                  return (
                    <button key={t} type="button" onClick={() => setType(t)} className={cn("flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium", type === t ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:bg-accent")}>
                      <M.icon className="size-4" />{M.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cc-m">{type === "bereavement" ? "Member who lost someone" : "Member"}</Label>
            <MemberPicker id="cc-m" name="memberId" initial={record?.memberId && record.memberName ? { id: record.memberId, name: record.memberName } : null} />
          </div>
          <div className={cn("space-y-2", type === "bereavement" ? "" : "sm:col-span-2")}>
            <Label htmlFor="cc-s">{type === "bereavement" ? "Who died" : type === "newborn" ? "Baby's name" : "Name (if not the member)"}</Label>
            <Input id="cc-s" name="subject" defaultValue={record?.subject ?? ""} placeholder={type === "bereavement" ? "e.g. Mzee Erisa Mukasa" : ""} />
          </div>
          {type === "bereavement" && (
            <div className="space-y-2">
              <Label htmlFor="cc-r">Relationship</Label>
              <Input id="cc-r" name="relationship" list="relationships" defaultValue={record?.relationship ?? ""} placeholder="Father, mother, child…" />
              <datalist id="relationships">{["Father", "Mother", "Husband", "Wife", "Son", "Daughter", "Brother", "Sister", "Grandparent", "In-law"].map((r) => <option key={r} value={r} />)}</datalist>
            </div>
          )}
          <div className="space-y-2"><Label htmlFor="cc-d">{isLoss ? "Date of death" : "Date"}</Label><Input id="cc-d" name="date" type="date" defaultValue={record?.date ?? today()} required /><FieldError error={error} name="date" /></div>
          {isLoss && (
            <>
              <div className="space-y-2"><Label htmlFor="cc-bd">Burial date</Label><Input id="cc-bd" name="burialDate" type="date" defaultValue={record?.burialDate ?? ""} /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="cc-bp">Burial place</Label><Input id="cc-bp" name="burialPlace" defaultValue={record?.burialPlace ?? ""} /></div>
            </>
          )}
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="cc-n">Notes</Label><Textarea id="cc-n" name="notes" rows={3} defaultValue={record?.notes ?? ""} placeholder="Support given, who represented the church, needs…" /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save case"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function VisitDialog({ forCase, memberId, memberName, open, onOpenChange }: { forCase?: CareCase | null; memberId?: string; memberName?: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const mid = str(fd, "memberId")
    await post("/care/visits", {
      careCaseId: forCase ? Number(forCase.id) : null, memberId: mid ? Number(mid) : null, visitee: mid ? null : str(fd, "visitee"),
      type: str(fd, "type"), date: str(fd, "date"), place: str(fd, "place"), team: str(fd, "team"), notes: str(fd, "notes"),
      giftAmount: num(fd, "giftAmount"), followUpOn: str(fd, "followUpOn"),
    })
    refreshCare()
    onOpenChange(false)
  }, "Visit logged")
  const initialMember = forCase?.memberId && forCase.memberName ? { id: forCase.memberId, name: forCase.memberName } : memberId && memberName ? { id: memberId, name: memberName } : null
  const defaultType = forCase?.type === "hospital" ? "hospital" : forCase?.type === "sickness" ? "sick" : forCase?.type === "newborn" ? "newborn" : forCase ? "bereavement" : "home"

  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Log a visit</DialogTitle><DialogDescription>{forCase ? `Part of the care for ${forCase.memberName ?? forCase.subject}.` : "Home, hospital, sick or newborn visits."}</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vv-m">Visited</Label>
            <MemberPicker id="vv-m" name="memberId" freeTextName="visitee" placeholder="Member or a name" initial={initialMember} />
            <FieldError error={error} name="visitee" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vv-t">Kind of visit</Label>
            <Select name="type" defaultValue={defaultType}>
              <SelectTrigger id="vv-t" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{VISIT_TYPES.map((t) => <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="vv-d">Date</Label><Input id="vv-d" name="date" type="date" max={today()} defaultValue={today()} required /></div>
          <div className="space-y-2"><Label htmlFor="vv-p">Where</Label><Input id="vv-p" name="place" placeholder="Home, Mulago ward 4B…" /></div>
          <div className="space-y-2"><Label htmlFor="vv-team">Who went</Label><Input id="vv-team" name="team" placeholder="Pastor, cell leader…" /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="vv-n">Notes & prayer points</Label><Textarea id="vv-n" name="notes" rows={3} /></div>
          <div className="space-y-2"><Label htmlFor="vv-g">Gift given ({CURRENCY})</Label><Input id="vv-g" name="giftAmount" type="number" min="0" step="0.01" /></div>
          <div className="space-y-2"><Label htmlFor="vv-f">Follow up on</Label><Input id="vv-f" name="followUpOn" type="date" min={today()} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}><Footprints className="size-4" /> Log visit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
