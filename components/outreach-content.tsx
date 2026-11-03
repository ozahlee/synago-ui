"use client"

import { useState, useEffect } from "react"
import { mutate } from "swr"
import { HandHelping, Plus, Baby, Hospital, Lock, School, Users, CircleHelp, MapPin, Gift, MoreHorizontal, Pencil, Trash2, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, StatCard } from "@/components/page"
import { Pager } from "@/components/pager"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, bool, num, runAction, str, useApiForm } from "@/components/form"
import { api, del, patch, post, qs, useApi } from "@/lib/api"
import useSWR from "swr"
import { useAuth } from "@/lib/auth"
import { CURRENCY, longDate, money, today } from "@/lib/format"
import { OUTREACH_TYPES, type Outreach, type Project } from "@/lib/types"
import type { Paginated } from "@/lib/api"
import { usePeriod } from "@/lib/period"
import { PeriodFilter, periodParams } from "@/components/period-filter"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/outreach") || k.startsWith("/accounts") || k.startsWith("/projects")))
const TYPE = {
  babies_home: { label: "Babies' home", icon: Baby },
  hospital: { label: "Hospital", icon: Hospital },
  prison: { label: "Prison", icon: Lock },
  school: { label: "School", icon: School },
  community: { label: "Community", icon: Users },
  other: { label: "Other", icon: CircleHelp },
} as const

type OutreachList = Paginated<Outreach> & { stats: { thisYear: number; peopleReached: number; spent: number } }

export function OutreachContent() {
  const { can } = useAuth()
  const canManage = can("members.manage")
  const [page, setPage] = useState(1)
  const period = usePeriod("all")
  useEffect(() => setPage(1), [period.range.from, period.range.to])
  const key = qs("/outreach", { ...periodParams(period), page, perPage: 12 })
  const { data, isLoading } = useSWR<OutreachList>(key, (p: string) => api<OutreachList>(p), { keepPreviousData: true })
  const [selected, setSelected] = useState<Outreach | null>(null)
  const [dialog, setDialog] = useState<"new" | "edit" | "delete" | null>(null)
  const rows = data?.data ?? []

  return (
    <Page>
      <PageHeader eyebrow="Office" title="Outreach" description="Visits to babies' homes, hospital wards, prisons and schools, and community work: who went, what was given and who was reached."
        actions={canManage && <Button onClick={() => setDialog("new")}><Plus className="size-4" /> Record outreach</Button>} />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Outreaches this year" icon={HandHelping} value={data?.stats.thisYear.toLocaleString()} />
        <StatCard label="People reached" icon={Users} tone="success" value={data?.stats.peopleReached.toLocaleString()} />
        <StatCard label="Given / spent" icon={Gift} tone="gold" value={data && money(data.stats.spent)} />
      </section>

      <PeriodFilter period={period} allowAll />

      {isLoading ? <div className="h-60 animate-pulse rounded-2xl bg-muted" /> : rows.length === 0 ? (
        <Card className="py-0"><EmptyState icon={HandHelping} title="No outreach recorded" description="Record visits to babies' homes, hospitals, prisons and more." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((o) => {
            const T = TYPE[o.type]
            return (
              <Card key={o.id} className="gap-0 p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><T.icon className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{T.label}</Badge>{o.project && <Badge variant="info">{o.project}</Badge>}</div>
                    <h3 className="mt-1.5 font-semibold leading-snug">{o.title}</h3>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" />{[o.place, longDate(o.date)].filter(Boolean).join(" · ")}</p>
                  </div>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => (setSelected(o), setDialog("edit"))}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => (setSelected(o), setDialog("delete"))}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {o.items && <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-sm"><Gift className="mr-1.5 inline size-4 text-muted-foreground" />{o.items}</p>}
                {o.notes && <p className="mt-2 text-sm text-muted-foreground">{o.notes}</p>}
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t pt-3 text-sm text-muted-foreground">
                  {o.peopleReached != null && <span><span className="font-semibold text-foreground tabular">{o.peopleReached}</span> reached</span>}
                  {o.cost != null && <span>{money(o.cost)}{o.expenseReference && <span className="ml-1 inline-flex items-center gap-1 text-xs"><Receipt className="size-3" />{o.expenseReference}</span>}</span>}
                  {o.team && <span><Users className="mr-1 inline size-3.5" />{o.team}</span>}
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <Pager meta={data?.meta} onPage={setPage} />

      <OutreachDialog key="new" open={dialog === "new"} onOpenChange={(o) => !o && setDialog(null)} />
      {selected && (
        <>
          <OutreachDialog key={`e-${selected.id}`} record={selected} open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} />
          <ConfirmDialog open={dialog === "delete"} onOpenChange={(o) => !o && setDialog(null)} title="Delete outreach" description="Any expense already posted stays in Accounts."
            onConfirm={async () => { const ok = await runAction(() => del(`/outreach/${selected.id}`), "Outreach deleted"); if (ok) refresh(); return ok }} />
        </>
      )}
    </Page>
  )
}

function OutreachDialog({ record, open, onOpenChange }: { record?: Outreach; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { can } = useAuth()
  const { data: projects = [] } = useApi<Project[]>(open && can("finance.view") ? "/projects" : null)
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const pid = str(fd, "projectId")
    const body = { title: str(fd, "title"), type: str(fd, "type"), place: str(fd, "place"), date: str(fd, "date"), peopleReached: num(fd, "peopleReached"),
      items: str(fd, "items"), team: str(fd, "team"), cost: num(fd, "cost"), projectId: pid && pid !== "none" ? Number(pid) : null, notes: str(fd, "notes"),
      recordExpense: bool(fd, "recordExpense") }
    if (record) await patch(`/outreach/${record.id}`, body)
    else await post("/outreach", body)
    refresh()
    onOpenChange(false)
  }, record ? "Outreach updated" : "Outreach recorded")
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{record ? "Edit outreach" : "Record outreach"}</DialogTitle><DialogDescription>Where the church went, what it gave and who it reached.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="o-t">Title</Label><Input id="o-t" name="title" defaultValue={record?.title} placeholder="e.g. Christmas visit to Sanyu Babies Home" required /><FieldError error={error} name="title" /></div>
          <div className="space-y-2">
            <Label htmlFor="o-ty">Kind</Label>
            <Select name="type" defaultValue={record?.type ?? "babies_home"}>
              <SelectTrigger id="o-ty" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{OUTREACH_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE[t].label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="o-d">Date</Label><Input id="o-d" name="date" type="date" defaultValue={record?.date ?? today()} required /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="o-p">Place</Label><Input id="o-p" name="place" defaultValue={record?.place ?? ""} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="o-i">Items given</Label><Textarea id="o-i" name="items" rows={2} defaultValue={record?.items ?? ""} placeholder="Diapers, milk formula, soap…" /></div>
          <div className="space-y-2"><Label htmlFor="o-r">People reached</Label><Input id="o-r" name="peopleReached" type="number" min="0" defaultValue={record?.peopleReached ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="o-tm">Team</Label><Input id="o-tm" name="team" defaultValue={record?.team ?? ""} placeholder="Mothers' Union, Youth…" /></div>
          <div className="space-y-2"><Label htmlFor="o-c">Cost / value ({CURRENCY})</Label><Input id="o-c" name="cost" type="number" min="0" step="0.01" defaultValue={record?.cost ?? ""} /></div>
          {projects.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="o-pj">Project</Label>
              <Select name="projectId" defaultValue={record?.projectId ?? "none"}>
                <SelectTrigger id="o-pj" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl border bg-secondary/40 px-4 py-3 sm:col-span-2">
            <div><Label htmlFor="o-ex">Post the cost to Accounts</Label><p className="text-xs text-muted-foreground">As an “Outreach” expense{record?.expenseReference ? ` (already ${record.expenseReference}; will be updated)` : ""}</p></div>
            <Switch id="o-ex" name="recordExpense" defaultChecked={!!record?.expenseReference} />
          </div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="o-n">Notes</Label><Textarea id="o-n" name="notes" rows={2} defaultValue={record?.notes ?? ""} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
