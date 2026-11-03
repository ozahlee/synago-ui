"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft, Plus, Pencil, Printer, Receipt, MoreHorizontal, MessageSquare, EyeOff, Eye, Trash2, Trophy, Target, Flag,
  CheckCircle2, Circle, Gift, Package, Users, Home, Search, HandCoins, AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, StatCard, TableSkeleton } from "@/components/page"
import { Pager } from "@/components/pager"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, num, runAction, str, useApiForm } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { HouseholdPicker } from "@/components/households-content"
import { ProjectDialog, SpendDialog, refreshProjects } from "@/components/projects-content"
import { api, del, patch, post, put, qs, useApi, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useSettings } from "@/lib/settings"
import { CURRENCY, date, humanize, longDate, money, today } from "@/lib/format"
import {
  PAYMENT_METHODS, type Loan, type CellGroupIndex, type Contribution, type ContributionKind, type ContributorType, type Ministry,
  type Organisation, type Pledge, type Project, type ProjectMilestone, type ProjectSummary,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { usePeriod } from "@/lib/period"
import { PeriodFilter, periodParams } from "@/components/period-filter"
import useSWR from "swr"
import { Attachments } from "@/components/attachments"

const STATUS = { planning: "info", active: "success", on_hold: "warning", completed: "gold" } as const
export const KIND_LABEL: Record<ContributionKind, string> = { gift: "Gift", thanksgiving: "Thanksgiving", pledge_payment: "Pledge payment", in_kind: "In kind" }
export const CONTRIBUTOR_LABEL: Record<ContributorType, string> = {
  member: "Member", household: "Family", cell_group: "Cell", ministry: "Ministry", organisation: "Organisation", named: "Well-wisher", anonymous: "Anonymous",
}
const pct = (a: number, b: number | null | undefined) => (b ? Math.min(100, (a / b) * 100) : 0)

function daysLeft(deadline: string | null) {
  if (!deadline) return null
  const d = Math.ceil((new Date(`${deadline}T23:59`).getTime() - Date.now()) / 86_400_000)
  return d
}

export function ProjectView() {
  const id = useSearchParams().get("id")
  const { can } = useAuth()
  const canManage = can("finance.manage")
  const { data: p, error } = useApi<Project>(id ? `/projects/${id}` : null)
  const { data: summary } = useApi<ProjectSummary>(id ? `/projects/${id}/summary` : null)
  const [dialog, setDialog] = useState<null | "give" | "spend" | "edit">(null)
  const [tab, setTab] = useState("contributions")

  if (error) return <Page><EmptyState icon={AlertTriangle} title="Couldn't load this project" description={error.message} /></Page>
  if (!p) return <Page><div className="h-10 w-64 animate-pulse rounded-xl bg-muted" /><div className="h-56 animate-pulse rounded-2xl bg-muted" /></Page>

  const raisedPct = pct(p.raised, p.goal)
  // giving less spending, plus money borrowed for the project less what has been repaid
  const cashInHand = p.raised - p.spent + (p.loanReceived ?? 0) - (p.loanRepaid ?? 0)
  const pledgeOutstanding = p.pledgeBalance
  const pledgedPct = Math.min(100 - raisedPct, pct(pledgeOutstanding, p.goal))
  const left = daysLeft(p.deadline)
  const gap = Math.max(0, p.goal - p.raised)

  return (
    <Page>
      <div className="space-y-3">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> Projects & giving</Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">{p.name}</h1>
              <Badge variant={STATUS[p.status]}>{humanize(p.status)}</Badge>
              {p.openForContributions && <Badge variant="gold">Open for giving</Badge>}
            </div>
            {p.description && <p className="mt-1.5 max-w-2xl text-muted-foreground">{p.description}</p>}
            {p.manager && <p className="mt-1 text-sm text-muted-foreground">Chair: <span className="font-medium text-foreground">{p.manager}</span></p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link href={`/projects/poster?id=${p.id}`} target="_blank"><Printer className="size-4" /> Poster</Link></Button>
            {canManage && <Button variant="outline" onClick={() => setDialog("edit")}><Pencil className="size-4" /> Edit</Button>}
            {canManage && <Button variant="outline" onClick={() => setDialog("spend")}><Receipt className="size-4" /> Record spending</Button>}
            {canManage && p.status !== "completed" && <Button onClick={() => setDialog("give")}><Plus className="size-4" /> Record contribution</Button>}
          </div>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="gap-0 p-6 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Raised</p>
              <p className="text-4xl font-semibold tabular">{money(p.raised)}</p>
              <p className="text-sm text-muted-foreground">of {money(p.goal)} goal</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-semibold tabular text-primary">{Math.round(raisedPct)}%</p>
              <p className="text-sm text-muted-foreground">
                {raisedPct >= 100 ? "Goal reached — praise God!" : `${money(gap)} to go`}
                {left !== null && raisedPct < 100 && <> · {left >= 0 ? `${left} day${left === 1 ? "" : "s"} left` : `deadline passed ${-left}d ago`}</>}
              </p>
            </div>
          </div>
          <div className="mt-5 flex h-5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full transition-all", raisedPct >= 100 ? "bg-gold" : "bg-primary")} style={{ width: `${raisedPct}%` }} />
            <div className="h-full bg-primary/25" style={{ width: `${pledgedPct}%` }} />
          </div>
          {(p.milestones?.length ?? 0) > 0 && p.goal > 0 && (
            <div className="relative mt-1 h-4">
              {p.milestones!.filter((m) => m.amount).reduce<{ m: ProjectMilestone; at: number }[]>((acc, m) => {
                const at = (acc.at(-1)?.at ?? 0) + (m.amount ?? 0)
                return [...acc, { m, at }]
              }, []).filter((x) => x.at <= p.goal).map(({ m, at }) => (
                <span key={m.id} title={`${m.title}: ${money(at)}`} className="absolute -translate-x-1/2 text-[10px] text-muted-foreground" style={{ left: `${pct(at, p.goal)}%` }}>
                  <Flag className={cn("size-3", m.status === "done" ? "text-success" : "")} />
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
            <Legend dot="bg-primary" label="Cash given" value={money(p.raised)} />
            <Legend dot="bg-primary/25" label="Still pledged" value={money(p.pledgeBalance)} />
            <Legend dot="bg-gold" label="In kind (value)" value={money(p.inKindValue)} />
            <Legend dot="bg-muted-foreground/40" label="Contributions" value={p.contributions.toLocaleString()} />
          </div>
          {p.deadline && <p className="mt-3 text-xs text-muted-foreground">Raising by {longDate(p.deadline)}{p.suggestedFamilyAmount ? ` · suggested ${money(p.suggestedFamilyAmount)} per family` : ""}</p>}
        </Card>

        <Card className="gap-0 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Spending</p>
          <p className="mt-1 text-2xl font-semibold tabular">{money(p.spent)}</p>
          <p className="text-sm text-muted-foreground">of {money(p.budget)} budget</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", p.spent > p.budget ? "bg-destructive" : "bg-info")} style={{ width: `${pct(p.spent, p.budget)}%` }} />
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            {(p.loanReceived ?? 0) > 0 && <>
              <div className="flex justify-between"><dt className="text-muted-foreground">Borrowed (received)</dt><dd className="tabular">+{money(p.loanReceived)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Loan repayments</dt><dd className="tabular">−{money(p.loanRepaid)}</dd></div>
            </>}
            <div className="flex justify-between"><dt className="text-muted-foreground">Cash in hand</dt><dd className={cn("font-semibold tabular", cashInHand < 0 && "text-destructive")}>{money(cashInHand)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Budget left</dt><dd className="font-semibold tabular">{money(p.remaining)}</dd></div>
          </dl>
          {(p.byCategory?.length ?? 0) > 0 && (
            <ul className="mt-4 space-y-1.5 border-t pt-3 text-xs">
              {p.byCategory!.slice(0, 4).map((c) => <li key={c.category} className="flex justify-between"><span className="text-muted-foreground">{c.category}</span><span className="tabular">{money(c.amount)}</span></li>)}
            </ul>
          )}
        </Card>
      </section>

      <ProjectLoans projectId={p.id} />

      {summary && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Gifts" icon={Gift} value={money(summary.byKind.gift)} />
          <StatCard label="Thanksgiving" icon={HandCoins} tone="gold" value={money(summary.byKind.thanksgiving)} />
          <StatCard label="Pledge payments" icon={Target} tone="info" value={money(summary.byKind.pledge_payment)} />
          <StatCard label="Families giving" icon={Home} tone="success" value={summary.families.filter((f) => f.total > 0).length.toLocaleString()}
            hint={`of ${summary.families.length} families`} />
        </section>
      )}

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="contributions">Contributions</TabsTrigger>
          <TabsTrigger value="honour">Honour roll</TabsTrigger>
          <TabsTrigger value="cells">Cells</TabsTrigger>
          <TabsTrigger value="families">Families</TabsTrigger>
          <TabsTrigger value="pledges">Pledges</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="contributions"><ContributionsTab project={p} canManage={canManage} /></TabsContent>
        <TabsContent value="honour"><HonourRoll summary={summary} /></TabsContent>
        <TabsContent value="cells"><CellsTab project={p} summary={summary} canManage={canManage} /></TabsContent>
        <TabsContent value="families"><FamiliesTab project={p} summary={summary} /></TabsContent>
        <TabsContent value="pledges"><PledgesTab project={p} /></TabsContent>
        <TabsContent value="spending"><SpendingTab project={p} /></TabsContent>
        <TabsContent value="milestones"><MilestonesTab project={p} canManage={canManage} /></TabsContent>
        <TabsContent value="documents"><Card className="p-6"><Attachments type="project" id={p.id} canEdit={canManage} title="Project documents" hint="Plans, bills of quantities, quotations, land title, contractor agreements, photos" suggestions={["Building plan", "Bill of quantities", "Quotation", "Land title", "Contract", "Progress photo"]} /></Card></TabsContent>
      </Tabs>

      {dialog === "give" && <ContributionDialog project={p} open onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "spend" && <SpendDialog project={p} open onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "edit" && <ProjectDialog record={p} open onOpenChange={(o) => !o && setDialog(null)} />}
    </Page>
  )
}

/** "Clear the loan": loans taken for this project, counting down as they're repaid. */
function ProjectLoans({ projectId }: { projectId: string }) {
  const { data } = useSWR<{ data: Loan[] }>(qs("/loans", { projectId }), (k: string) => api<{ data: Loan[] }>(k))
  const loans = (data?.data ?? []).filter((l) => l.status !== "proposed")
  if (!loans.length) return null
  return (
    <section className="grid gap-5 md:grid-cols-2">
      {loans.map((l) => {
        const s = l.summary
        const owed = s.outstanding + s.undrawn
        return (
          <Card key={l.id} className="gap-0 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clear the loan</p>
                <h3 className="font-semibold">{l.lender}</h3>
              </div>
              <Button variant="ghost" size="sm" asChild><Link href={`/loans/view?id=${l.id}`}>Open loan →</Link></Button>
            </div>
            <p className="mt-3 text-sm"><span className="text-2xl font-semibold tabular">{money(owed)}</span> <span className="text-muted-foreground">still owed · {Math.round(s.progress)}% repaid</span></p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-success/20"><div className="ml-auto h-full rounded-full bg-primary" style={{ width: `${Math.max(0, 100 - s.progress)}%` }} /></div>
            <p className="mt-2 text-xs text-muted-foreground">
              {s.arrears.count > 0 ? <span className="text-destructive">{money(s.arrears.amount)} overdue</span>
                : s.nextInstallment ? <>Next {money(s.nextInstallment.amount)} on {date(s.nextInstallment.dueDate)}</> : l.status === "closed" ? "Fully repaid" : "Waiting for the money"}
              {s.endDate && l.status !== "closed" ? ` · last instalment ${date(s.endDate)}` : ""}. Giving to this project repays it.
            </p>
          </Card>
        )
      })}
    </section>
  )
}

function Legend({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className={cn("size-2 rounded-full", dot)} />{label}</p>
      <p className="font-semibold tabular">{value}</p>
    </div>
  )
}

// ---------------------------------------------------------------- contributions

function ContributionsTab({ project, canManage }: { project: Project; canManage: boolean }) {
  const [kind, setKind] = useState("all")
  const [type, setType] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [removing, setRemoving] = useState<Contribution | null>(null)
  const period = usePeriod("all")
  useEffect(() => setPage(1), [period.range.from, period.range.to])
  const { rows, meta, isLoading } = usePaginated<Contribution>(qs(`/projects/${project.id}/contributions`, {
    kind: kind === "all" ? null : kind, contributorType: type === "all" ? null : type, search: search || null, ...periodParams(period), page, perPage: 20,
  }))

  const thank = (c: Contribution) => runAction(() => post(`/contributions/${c.id}/thank`), "Thank-you SMS queued")
  const toggleHide = async (c: Contribution) => {
    if (await runAction(() => patch(`/contributions/${c.id}`, { hideName: !c.hideName }), c.hideName ? "Name shown on the honour roll" : "Name hidden on the honour roll")) refreshProjects()
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-end gap-2 border-b p-4">
        <PeriodFilter period={period} allowAll />
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => (setSearch(e.target.value), setPage(1))} placeholder="Name, pledge no., receipt…" className="pl-9" />
        </div>
        <Select value={kind} onValueChange={(v) => (setKind(v), setPage(1))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All kinds</SelectItem>{Object.entries(KIND_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => (setType(v), setPage(1))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All givers</SelectItem>{Object.entries(CONTRIBUTOR_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {isLoading ? <TableSkeleton /> : rows.length === 0 ? <EmptyState icon={Gift} title="No contributions yet" description="Record the first gift, thanksgiving or in-kind contribution." /> : (
        <Table>
          <TableHeader>
            <TableRow><TableHead>Date</TableHead><TableHead>From</TableHead><TableHead>Kind</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="hidden md:table-cell">Receipt</TableHead><TableHead className="w-10" /></TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{date(c.date)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 font-medium">{c.contributor}{c.hideName && <EyeOff className="size-3.5 text-muted-foreground" aria-label="Hidden on the honour roll" />}</div>
                  <div className="text-xs text-muted-foreground">
                    {CONTRIBUTOR_LABEL[c.contributorType]}{c.pledgeNumber ? ` · ${c.pledgeNumber}` : ""}{c.event ? ` · ${c.event}` : ""}{c.service ? ` · ${c.service}` : ""}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={c.kind === "in_kind" ? "gold" : c.kind === "thanksgiving" ? "info" : c.kind === "pledge_payment" ? "secondary" : "outline"}>{KIND_LABEL[c.kind]}</Badge>
                  {c.inKindDescription && <div className="mt-0.5 text-xs text-muted-foreground">{c.inKindDescription}</div>}
                </TableCell>
                <TableCell className="text-right font-semibold tabular">
                  {c.kind === "in_kind" ? <span className="text-muted-foreground">{c.inKindValue ? `≈ ${money(c.inKindValue)}` : "—"}</span> : money(c.amount)}
                </TableCell>
                <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">{c.reference}</TableCell>
                <TableCell>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={!c.canThank} onClick={() => thank(c)}><MessageSquare className="size-4" /> Send thank-you SMS</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleHide(c)}>{c.hideName ? <><Eye className="size-4" /> Show name publicly</> : <><EyeOff className="size-4" /> Hide name publicly</>}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setRemoving(c)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pager meta={meta} onPage={setPage} />
      {removing && (
        <ConfirmDialog open onOpenChange={(o) => !o && setRemoving(null)} title="Delete this contribution?"
          description={`${removing.contributor} · ${removing.reference}. Its entry in the books (accounts or offertory) is removed too.`}
          onConfirm={async () => { const ok = await runAction(() => del(`/contributions/${removing.id}`), "Contribution deleted"); if (ok) refreshProjects(); return ok }} />
      )}
    </Card>
  )
}

// ---------------------------------------------------------------- honour roll

function HonourRoll({ summary }: { summary?: ProjectSummary }) {
  if (!summary) return <Card className="h-64 animate-pulse bg-muted" />
  const rows = summary.honourRoll
  if (!rows.length) return <Card className="py-0"><EmptyState icon={Trophy} title="No givers yet" description="The honour roll fills as contributions come in." /></Card>
  const top = rows[0].total
  return (
    <Card className="gap-0 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Honour roll</h3>
        <p className="text-xs text-muted-foreground">Givers who asked to stay private appear as “Well-wisher”.</p>
      </div>
      <ol className="space-y-2.5">
        {rows.map((r, i) => (
          <li key={`${r.name}-${i}`} className="flex items-center gap-3">
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              i === 0 ? "bg-gold text-gold-foreground" : i < 3 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{r.name} <span className="text-xs font-normal text-muted-foreground">· {CONTRIBUTOR_LABEL[r.type]}{r.gifts > 1 ? ` · ${r.gifts} gifts` : ""}</span></span>
                <span className="shrink-0 font-semibold tabular">{money(r.total)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/70" style={{ width: `${pct(r.total, top)}%` }} /></div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

// ---------------------------------------------------------------- cells

function CellsTab({ project, summary, canManage }: { project: Project; summary?: ProjectSummary; canManage: boolean }) {
  const [editing, setEditing] = useState(false)
  if (!summary) return <Card className="h-64 animate-pulse bg-muted" />
  const cells = [...summary.cells].sort((a, b) => b.total - a.total)
  return (
    <Card className="gap-0 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Cell league</h3>
          <p className="text-xs text-muted-foreground">Member and family gifts count toward their cell. {summary.unattributedToCell > 0 && `${money(summary.unattributedToCell)} came from outside any cell (organisations, well-wishers…).`}</p>
        </div>
        {canManage && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Target className="size-4" /> Set cell targets</Button>}
      </div>
      {cells.length === 0 ? <EmptyState icon={Users} title="No cell groups" description="Create cell groups to see a league." /> : (
        <ul className="space-y-3">
          {cells.map((c, i) => {
            const hit = c.target ? c.total >= c.target : false
            return (
              <li key={c.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate"><span className="mr-2 text-xs text-muted-foreground tabular">{i + 1}.</span><span className="font-medium">{c.name}</span>{c.area && <span className="text-xs text-muted-foreground"> · {c.area}</span>}</span>
                  <span className="shrink-0 tabular"><span className="font-semibold">{money(c.total)}</span>{c.target ? <span className="text-muted-foreground"> / {money(c.target)}</span> : null}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", hit ? "bg-gold" : "bg-primary")} style={{ width: `${c.target ? pct(c.total, c.target) : pct(c.total, cells[0].total || 1)}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {editing && <CellTargetsDialog project={project} summary={summary} open onOpenChange={setEditing} />}
    </Card>
  )
}

function CellTargetsDialog({ project, summary, open, onOpenChange }: { project: Project; summary: ProjectSummary; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [split, setSplit] = useState("")
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(summary.cells.map((c) => [c.id, c.target ? String(c.target) : ""])))
  const { handleSubmit, pending, reset } = useApiForm(async () => {
    await put(`/projects/${project.id}/targets`, { cells: summary.cells.map((c) => ({ cellGroupId: Number(c.id), target: values[c.id] ? Number(values[c.id]) : null })) })
    refreshProjects()
    onOpenChange(false)
  }, "Cell targets saved")
  const splitEvenly = () => {
    const each = Math.round(Number(split || project.goal) / Math.max(1, summary.cells.length))
    setValues(Object.fromEntries(summary.cells.map((c) => [c.id, String(each)])))
  }
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>Cell targets</DialogTitle><DialogDescription>How much each cell is asked to raise for {project.name}.</DialogDescription></DialogHeader>
        <div className="flex gap-2">
          <Input type="number" min="0" placeholder={`Total (default ${money(project.goal)})`} value={split} onChange={(e) => setSplit(e.target.value)} />
          <Button type="button" variant="outline" onClick={splitEvenly}>Split evenly</Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2">
          {summary.cells.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <Label htmlFor={`ct-${c.id}`} className="flex-1 truncate font-normal">{c.name}</Label>
              <Input id={`ct-${c.id}`} type="number" min="0" className="w-40" value={values[c.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [c.id]: e.target.value }))} />
            </div>
          ))}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save targets"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------- families

function FamiliesTab({ project, summary }: { project: Project; summary?: ProjectSummary }) {
  const [filter, setFilter] = useState<"all" | "given" | "not">("all")
  if (!summary) return <Card className="h-64 animate-pulse bg-muted" />
  const suggested = project.suggestedFamilyAmount
  const rows = summary.families
    .filter((f) => filter === "all" || (filter === "given" ? f.total > 0 : f.total === 0))
    .sort((a, b) => b.total - a.total)
  const met = suggested ? summary.families.filter((f) => f.total >= suggested).length : null
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
        <div>
          <h3 className="font-semibold">Families</h3>
          <p className="text-xs text-muted-foreground">
            Gifts by any member of the family count{suggested ? ` · suggested ${money(suggested)} per family · ${met} of ${summary.families.length} met it` : ""}.
            {" "}<Link href="/households" className="text-primary hover:underline">Manage families</Link>
          </p>
        </div>
        <div className="flex gap-1">
          {(["all", "given", "not"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f === "all" ? "All" : f === "given" ? "Have given" : "Not yet"}</Button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? <EmptyState icon={Home} title="No families here" description="Register households under Congregation → Families." /> : (
        <Table>
          <TableHeader><TableRow><TableHead>Family</TableHead><TableHead className="hidden sm:table-cell">Head</TableHead><TableHead className="text-right">Given</TableHead>{suggested ? <TableHead className="w-48">Progress</TableHead> : null}</TableRow></TableHeader>
          <TableBody>
            {rows.map((f) => (
              <TableRow key={f.id}>
                <TableCell><span className="font-medium">{f.name}</span><span className="text-xs text-muted-foreground"> · {f.members} member{f.members === 1 ? "" : "s"}</span></TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{f.head ?? "—"}</TableCell>
                <TableCell className={cn("text-right font-semibold tabular", f.total === 0 && "text-muted-foreground")}>{money(f.total)}</TableCell>
                {suggested ? (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", f.total >= suggested ? "bg-gold" : "bg-primary")} style={{ width: `${pct(f.total, suggested)}%` }} /></div>
                      <span className="w-9 text-right text-xs tabular text-muted-foreground">{Math.round(pct(f.total, suggested))}%</span>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------- pledges

function PledgesTab({ project }: { project: Project }) {
  const { rows, isLoading } = usePaginated<Pledge>(qs("/pledges", { projectId: project.id, perPage: 50 }))
  const promised = rows.reduce((s, r) => s + r.amount, 0)
  const paid = rows.reduce((s, r) => s + r.paid, 0)
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
        <div>
          <h3 className="font-semibold">Pledges for this project</h3>
          {rows.length > 0 && <p className="text-xs text-muted-foreground">{money(paid)} paid of {money(promised)} promised ({Math.round(pct(paid, promised))}%)</p>}
        </div>
        <Button variant="outline" size="sm" asChild><Link href="/pledges">All pledges →</Link></Button>
      </div>
      {isLoading ? <TableSkeleton /> : rows.length === 0 ? <EmptyState icon={Target} title="No pledges yet" description="Pledges made toward this project appear here; payments count as contributions." /> : (
        <Table>
          <TableHeader><TableRow><TableHead>Pledger</TableHead><TableHead className="text-right">Promised</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="w-40">Progress</TableHead><TableHead className="hidden md:table-cell">Due</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell><span className="font-medium">{r.pledger}</span>{r.pledgeNumber && <span className="text-xs text-muted-foreground"> · {r.pledgeNumber}</span>}</TableCell>
                <TableCell className="text-right tabular">{money(r.amount)}</TableCell>
                <TableCell className="text-right font-semibold tabular">{money(r.paid)}</TableCell>
                <TableCell><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", r.paid >= r.amount ? "bg-gold" : "bg-primary")} style={{ width: `${pct(r.paid, r.amount)}%` }} /></div></TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{date(r.dueDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------- spending

function SpendingTab({ project }: { project: Project }) {
  const tx = project.transactions ?? []
  return (
    <Card className="gap-0 overflow-hidden py-0">
      {tx.length === 0 ? <EmptyState icon={Receipt} title="Nothing recorded yet" description="Spending and other income tagged to this project shows here and in Accounts." /> : (
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>What</TableHead><TableHead className="hidden md:table-cell">Category</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
          <TableBody>
            {tx.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{date(t.date)}</TableCell>
                <TableCell><div className="font-medium">{t.description}</div>{t.payee && <div className="text-xs text-muted-foreground">{t.type === "expense" ? "Paid to" : "From"} {t.payee}</div>}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{t.category}</TableCell>
                <TableCell className={cn("text-right font-semibold tabular", t.type === "expense" ? "text-destructive" : "text-success")}>{t.type === "expense" ? "−" : "+"}{money(t.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------- milestones

function MilestonesTab({ project, canManage }: { project: Project; canManage: boolean }) {
  const [editing, setEditing] = useState<ProjectMilestone | "new" | null>(null)
  const [removing, setRemoving] = useState<ProjectMilestone | null>(null)
  const ms = project.milestones ?? []
  const toggle = async (m: ProjectMilestone) => {
    if (await runAction(() => patch(`/milestones/${m.id}`, { status: m.status === "done" ? "pending" : "done" }), m.status === "done" ? "Marked pending" : "Milestone reached 🎉")) refreshProjects()
  }
  let running = 0
  return (
    <Card className="gap-0 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div><h3 className="font-semibold">Milestones</h3><p className="text-xs text-muted-foreground">Phases like “pay deposit”, “title deed”, “foundation”, “roofing”.</p></div>
        {canManage && <Button size="sm" variant="outline" onClick={() => setEditing("new")}><Plus className="size-4" /> Add milestone</Button>}
      </div>
      {ms.length === 0 ? <EmptyState icon={Flag} title="No milestones" description="Break the project into phases so the church can see progress." /> : (
        <ol className="relative space-y-4 border-l-2 border-muted pl-6">
          {ms.map((m) => {
            running += m.amount ?? 0
            const funded = m.amount ? project.raised >= running : false
            return (
              <li key={m.id} className="relative">
                <button type="button" disabled={!canManage} onClick={() => toggle(m)} className="absolute -left-[35px] top-0.5 rounded-full bg-card" aria-label={m.status === "done" ? "Mark pending" : "Mark done"}>
                  {m.status === "done" ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-muted-foreground" />}
                </button>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className={cn("font-medium", m.status === "done" && "text-muted-foreground line-through")}>{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.amount ? `${money(m.amount)} · ` : ""}
                      {m.status === "done" ? `Done ${date(m.doneOn)}` : m.dueDate ? `Due ${date(m.dueDate)}` : "No date"}
                      {m.amount && m.status !== "done" ? (funded ? " · funds available" : ` · needs ${money(running - project.raised)} more`) : ""}
                    </p>
                    {m.notes && <p className="mt-0.5 text-sm text-muted-foreground">{m.notes}</p>}
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(m)} aria-label="Edit"><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => setRemoving(m)} aria-label="Delete"><Trash2 className="size-4" /></Button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
      {editing && <MilestoneDialog project={project} record={editing === "new" ? undefined : editing} open onOpenChange={(o) => !o && setEditing(null)} />}
      {removing && (
        <ConfirmDialog open onOpenChange={(o) => !o && setRemoving(null)} title={`Delete “${removing.title}”?`} description="It is removed from the project timeline."
          onConfirm={async () => { const ok = await runAction(() => del(`/milestones/${removing.id}`), "Milestone deleted"); if (ok) refreshProjects(); return ok }} />
      )}
    </Card>
  )
}

function MilestoneDialog({ project, record, open, onOpenChange }: { project: Project; record?: ProjectMilestone; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const body = { title: str(fd, "title"), amount: num(fd, "amount"), dueDate: str(fd, "dueDate"), notes: str(fd, "notes") }
    if (record) await patch(`/milestones/${record.id}`, body)
    else await post(`/projects/${project.id}/milestones`, body)
    refreshProjects()
    onOpenChange(false)
  }, record ? "Milestone updated" : "Milestone added")
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{record ? "Edit milestone" : "New milestone"}</DialogTitle><DialogDescription>{project.name}</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="ms-t">Title</Label><Input id="ms-t" name="title" defaultValue={record?.title} required placeholder="e.g. Pay 30% deposit" /><FieldError error={error} name="title" /></div>
          <div className="space-y-2"><Label htmlFor="ms-a">Cost ({CURRENCY})</Label><Input id="ms-a" name="amount" type="number" min="0" defaultValue={record?.amount ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="ms-d">Due</Label><Input id="ms-d" name="dueDate" type="date" defaultValue={record?.dueDate ?? ""} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="ms-n">Notes</Label><Input id="ms-n" name="notes" defaultValue={record?.notes ?? ""} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------- record a contribution

const GIVER_ICON: Record<ContributorType, typeof Users> = { member: Users, household: Home, cell_group: Users, ministry: Users, organisation: Package, named: Gift, anonymous: EyeOff }

export function ContributionDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { services } = useSettings()
  const [kind, setKind] = useState<ContributionKind>("gift")
  const [giver, setGiver] = useState<ContributorType>("member")
  const [hideName, setHideName] = useState(false)
  const [sendThanks, setSendThanks] = useState(true)
  const needs = (t: ContributorType) => giver === t && kind !== "pledge_payment"
  const { data: orgs } = useApi<Organisation[]>(open && needs("organisation") ? "/organisations" : null)
  const { data: cells } = useApi<CellGroupIndex>(open && needs("cell_group") ? "/cell-groups" : null)
  const { data: ministries } = useApi<Ministry[]>(open && needs("ministry") ? "/ministries" : null)
  const { rows: pledges } = usePaginated<Pledge>(open && kind === "pledge_payment" ? qs("/pledges", { projectId: project.id, perPage: 100 }) : null)
  const openPledges = pledges.filter((p) => p.balance > 0)

  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const id = (k: string) => { const v = str(fd, k); return v && v !== "none" ? Number(v) : null }
    const body = {
      kind,
      contributorType: kind === "pledge_payment" ? undefined : giver,
      memberId: id("memberId"), householdId: id("householdId"), cellGroupId: id("cellGroupId"), ministryId: id("ministryId"), organisationId: id("organisationId"),
      contributorName: str(fd, "contributorName"), phone: str(fd, "phone"),
      date: str(fd, "date"),
      amount: kind === "in_kind" ? null : num(fd, "amount"),
      inKindDescription: kind === "in_kind" ? str(fd, "inKindDescription") : null,
      inKindValue: kind === "in_kind" ? num(fd, "inKindValue") : null,
      paymentMethod: kind === "in_kind" ? null : str(fd, "paymentMethod"),
      service: (() => { const s = str(fd, "service"); return s && s !== "none" ? s : null })(),
      eventId: id("eventId"), pledgeId: id("pledgeId"),
      reference: str(fd, "reference"), notes: str(fd, "notes"),
      hideName, sendThanks: giver !== "anonymous" && sendThanks,
    }
    await post(`/projects/${project.id}/contributions`, body)
    refreshProjects()
    onOpenChange(false)
  }, "Contribution recorded")

  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Record a contribution</DialogTitle><DialogDescription>Toward {project.name}. A receipt number is issued and it lands in the books once.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Kind</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(KIND_LABEL) as ContributionKind[]).map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)}
                  className={cn("rounded-xl border px-3 py-2 text-sm font-medium transition", kind === k ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>{KIND_LABEL[k]}</button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {kind === "gift" && "Cash given straight to the project — recorded in Accounts."}
              {kind === "thanksgiving" && "Thanksgiving toward the project (e.g. a family's thanksgiving service) — recorded in the offertory book."}
              {kind === "pledge_payment" && "A payment toward a pledge for this project — recorded in the offertory book and against the pledge."}
              {kind === "in_kind" && "Cement, sand, iron sheets, labour… recorded at an estimated value; not cash."}
            </p>
          </div>

          {kind === "pledge_payment" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ct-pl">Pledge</Label>
              <Select name="pledgeId" required>
                <SelectTrigger id="ct-pl" className="w-full"><SelectValue placeholder={openPledges.length ? "Choose the pledge" : "No open pledges for this project"} /></SelectTrigger>
                <SelectContent>{openPledges.map((p) => <SelectItem key={p.id} value={p.id}>{p.pledger}{p.pledgeNumber ? ` (${p.pledgeNumber})` : ""} · {money(p.balance)} left</SelectItem>)}</SelectContent>
              </Select>
              <FieldError error={error} name="pledgeId" />
            </div>
          ) : (
            <>
              <div className="space-y-2 sm:col-span-2">
                <Label>Given by</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(CONTRIBUTOR_LABEL) as ContributorType[]).map((t) => {
                    const Icon = GIVER_ICON[t]
                    return (
                      <button key={t} type="button" onClick={() => setGiver(t)}
                        className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition", giver === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                        <Icon className="size-3.5" />{CONTRIBUTOR_LABEL[t]}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                {giver === "member" && <><Label htmlFor="ct-m">Member</Label><MemberPicker id="ct-m" name="memberId" placeholder="Search by name or pledge number…" /><FieldError error={error} name="memberId" /></>}
                {giver === "household" && <><Label htmlFor="ct-h">Family</Label><HouseholdPicker id="ct-h" name="householdId" /><FieldError error={error} name="householdId" /></>}
                {giver === "cell_group" && (
                  <><Label htmlFor="ct-c">Cell</Label>
                    <Select name="cellGroupId"><SelectTrigger id="ct-c" className="w-full"><SelectValue placeholder="Choose a cell" /></SelectTrigger>
                      <SelectContent>{(cells?.groups ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                    <FieldError error={error} name="cellGroupId" /></>
                )}
                {giver === "ministry" && (
                  <><Label htmlFor="ct-mi">Ministry</Label>
                    <Select name="ministryId"><SelectTrigger id="ct-mi" className="w-full"><SelectValue placeholder="Choose a ministry" /></SelectTrigger>
                      <SelectContent>{(ministries ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
                    <FieldError error={error} name="ministryId" /></>
                )}
                {giver === "organisation" && (
                  <><Label htmlFor="ct-o">Organisation</Label>
                    <Select name="organisationId"><SelectTrigger id="ct-o" className="w-full"><SelectValue placeholder={orgs?.length === 0 ? "No organisations yet — add under Finance → Organisations" : "Choose an organisation"} /></SelectTrigger>
                      <SelectContent>{(orgs ?? []).map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent></Select>
                    <FieldError error={error} name="organisationId" /></>
                )}
                {giver === "named" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="ct-n">Name</Label><Input id="ct-n" name="contributorName" placeholder="e.g. Hon. Okello (friend of the church)" /><FieldError error={error} name="contributorName" /></div>
                    <div className="space-y-2"><Label htmlFor="ct-ph">Phone (for the thank-you)</Label><Input id="ct-ph" name="phone" type="tel" /></div>
                  </div>
                )}
                {giver === "anonymous" && <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">Recorded without a name. Counts toward the total only.</p>}
              </div>
            </>
          )}

          {kind === "in_kind" ? (
            <>
              <div className="space-y-2"><Label htmlFor="ct-ik">What was given</Label><Input id="ct-ik" name="inKindDescription" placeholder="e.g. 50 bags of cement" /><FieldError error={error} name="inKindDescription" /></div>
              <div className="space-y-2"><Label htmlFor="ct-iv">Estimated value ({CURRENCY})</Label><Input id="ct-iv" name="inKindValue" type="number" min="0" /></div>
            </>
          ) : (
            <>
              <div className="space-y-2"><Label htmlFor="ct-a">Amount ({CURRENCY})</Label><Input id="ct-a" name="amount" type="number" min="1" step="0.01" required /><FieldError error={error} name="amount" /></div>
              <div className="space-y-2">
                <Label htmlFor="ct-pm">Method</Label>
                <Select name="paymentMethod" defaultValue="Cash">
                  <SelectTrigger id="ct-pm" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2"><Label htmlFor="ct-d">Date</Label><Input id="ct-d" name="date" type="date" max={today()} defaultValue={today()} required /><FieldError error={error} name="date" /></div>
          <div className="space-y-2">
            <Label htmlFor="ct-s">Service</Label>
            <Select name="service" defaultValue="none">
              <SelectTrigger id="ct-s" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Not at a service</SelectItem>{services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {(project.events?.length ?? 0) > 0 && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ct-e">Fundraising event</Label>
              <Select name="eventId" defaultValue="none">
                <SelectTrigger id="ct-e" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem>{project.events!.map((e) => <SelectItem key={e.id} value={e.id}>{e.title} · {date(e.date)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2"><Label htmlFor="ct-r">Receipt no. (optional)</Label><Input id="ct-r" name="reference" placeholder="Auto: CTB-…" /><FieldError error={error} name="reference" /></div>
          <div className="space-y-2"><Label htmlFor="ct-no">Notes</Label><Textarea id="ct-no" name="notes" rows={1} /></div>

          {giver !== "anonymous" && (
            <div className="space-y-3 rounded-xl border bg-secondary/40 p-4 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div><Label htmlFor="ct-hide">Keep the name private</Label><p className="text-xs text-muted-foreground">Shows as “Well-wisher” on the honour roll and poster</p></div>
                <Switch id="ct-hide" checked={hideName} onCheckedChange={setHideName} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div><Label htmlFor="ct-sms">Send a thank-you SMS</Label><p className="text-xs text-muted-foreground">With the amount and receipt number, if a phone is on record</p></div>
                <Switch id="ct-sms" checked={sendThanks} onCheckedChange={setSendThanks} />
              </div>
            </div>
          )}

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Record contribution"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
