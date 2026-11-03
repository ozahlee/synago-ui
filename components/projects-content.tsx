"use client"

import { useState } from "react"
import { mutate } from "swr"
import { Hammer, Plus, Wallet, TrendingUp, AlertTriangle, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState, Page, PageHeader, StatCard } from "@/components/page"
import { FieldError, num, str, useApiForm } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { patch, post, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { CURRENCY, humanize, longDate, money, today } from "@/lib/format"
import { PAYMENT_METHODS, TRANSACTION_CATEGORIES, type Project, type ProjectStats } from "@/lib/types"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export const refreshProjects = () => mutate((k) => typeof k === "string" && (k.startsWith("/projects") || k.startsWith("/accounts") || k.startsWith("/budgets") || k.startsWith("/pledges") || k.startsWith("/offertory")))
const STATUS = { planning: "info", active: "success", on_hold: "warning", completed: "gold" } as const
const EXPENSE_CATS = [...new Set(["Building materials", "Labour", "Professional fees", "Transport", "Equipment", ...TRANSACTION_CATEGORIES.expense.filter((c) => c !== "Other"), "Other"])]

export function ProjectsContent() {
  const router = useRouter()
  const { can } = useAuth()
  const canManage = can("finance.manage")
  const { data: projects = [], isLoading } = useApi<Project[]>("/projects")
  const { data: stats } = useApi<ProjectStats>("/projects/stats")
  const [creating, setCreating] = useState(false)
  const open = projects.filter((p) => p.openForContributions)
  const other = projects.filter((p) => !p.openForContributions)

  return (
    <Page>
      <PageHeader
        eyebrow="Stewardship"
        title="Projects & giving"
        description="Land, building and other causes: what we're raising, who has given (members, families, cells, ministries, organisations, well-wishers) and how it's being spent."
        actions={canManage && <Button onClick={() => setCreating(true)}><Plus className="size-4" /> New project</Button>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open for giving" icon={Hammer} value={stats?.openProjects.toLocaleString()} hint={stats && `Goal ${money(stats.goalOpen)}`} />
        <StatCard label="Raised (open projects)" icon={TrendingUp} tone="success" value={stats && money(stats.raisedOpen)}
          hint={stats?.goalOpen ? `${Math.round((stats.raisedOpen / stats.goalOpen) * 100)}% of goal` : undefined} />
        <StatCard label={`Given in ${new Date().getFullYear()}`} icon={Wallet} tone="gold" value={stats && money(stats.raisedThisYear)}
          hint={stats?.inKindThisYear ? `+ ${money(stats.inKindThisYear)} in kind` : undefined} />
        <StatCard label="Contributors this year" icon={Users} tone="info" value={stats?.contributors.toLocaleString()} hint="Members, families, cells, organisations" />
      </section>

      {isLoading ? <div className="grid gap-5 md:grid-cols-2">{[1, 2].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />)}</div>
        : projects.length === 0 ? <Card className="py-0"><EmptyState icon={Hammer} title="No projects yet" description="Create one for land, a building or any cause, and open it for contributions." /></Card> : (
        <>
          {open.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Open for contributions</h2>
              <div className="grid gap-5 md:grid-cols-2">{open.map((p) => <ProjectCard key={p.id} p={p} onOpen={() => router.push(`/projects/view?id=${p.id}`)} />)}</div>
            </section>
          )}
          {other.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Other projects</h2>
              <div className="grid gap-5 md:grid-cols-2">{other.map((p) => <ProjectCard key={p.id} p={p} onOpen={() => router.push(`/projects/view?id=${p.id}`)} />)}</div>
            </section>
          )}
        </>
      )}

      {creating && <ProjectDialog open onOpenChange={(o) => !o && setCreating(false)} />}
    </Page>
  )
}

function ProjectCard({ p, onOpen }: { p: Project; onOpen: () => void }) {
  const pct = p.goal ? Math.min(100, (p.raised / p.goal) * 100) : 0
  const pledgedPct = p.goal ? Math.min(100 - pct, (p.pledgeBalance / p.goal) * 100) : 0
  const over = p.budget > 0 && p.spent > p.budget
  return (
    <Card className="cursor-pointer gap-0 p-5 transition hover:-translate-y-0.5 hover:border-primary/25" onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <Badge variant={STATUS[p.status]}>{humanize(p.status)}</Badge>
            {p.openForContributions && <Badge variant="gold">Open for giving</Badge>}
          </div>
          {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
        </div>
      </div>
      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span><span className="text-xl font-semibold tabular">{money(p.raised)}</span> <span className="text-muted-foreground">raised of {money(p.goal)}</span></span>
          <span className="font-semibold tabular">{Math.round(pct)}%</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-muted" title={`Raised ${money(p.raised)} · still pledged ${money(p.pledgeBalance)}`}>
          <div className={cn("h-full", pct >= 100 ? "bg-gold" : "bg-primary")} style={{ width: `${pct}%` }} />
          <div className="h-full bg-primary/25" style={{ width: `${pledgedPct}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {p.pledgeBalance > 0 && <span><span className="inline-block size-2 rounded-full bg-primary/25" /> {money(p.pledgeBalance)} still pledged</span>}
          {p.inKindValue > 0 && <span>+ {money(p.inKindValue)} in kind</span>}
          <span>{p.contributions} contribution{p.contributions === 1 ? "" : "s"}</span>
          {p.deadline && <span>by {longDate(p.deadline)}</span>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
        <span className="text-muted-foreground">Spent <span className="font-semibold text-foreground tabular">{money(p.spent)}</span> of {money(p.budget)} budget</span>
        {over && <span className="flex items-center gap-1 font-medium text-destructive"><AlertTriangle className="size-4" /> Over budget</span>}
      </div>
    </Card>
  )
}

export function ProjectDialog({ record, open, onOpenChange }: { record?: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [status, setStatus] = useState(record?.status ?? "active")
  const [openGiving, setOpenGiving] = useState(record?.openForContributions ?? true)
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const mgr = str(fd, "managerMemberId")
    const body = { name: str(fd, "name"), description: str(fd, "description"), budget: num(fd, "budget"), target: num(fd, "target"), status,
      openForContributions: openGiving, startDate: str(fd, "startDate"), endDate: str(fd, "endDate"), deadline: str(fd, "deadline"),
      suggestedFamilyAmount: num(fd, "suggestedFamilyAmount"), managerMemberId: mgr ? Number(mgr) : null }
    if (record) await patch(`/projects/${record.id}`, body)
    else await post("/projects", body)
    refreshProjects()
    onOpenChange(false)
  }, record ? "Project updated" : "Project created")
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{record ? `Edit ${record.name}` : "New project"}</DialogTitle><DialogDescription>Land, a building, a vehicle, a borehole… Open it for contributions to collect giving toward it.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="pj-n">Name</Label><Input id="pj-n" name="name" defaultValue={record?.name} required placeholder="e.g. Land for the church school" /><FieldError error={error} name="name" /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="pj-d">Description</Label><Textarea id="pj-d" name="description" rows={2} defaultValue={record?.description ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="pj-b">Budget ({CURRENCY})</Label><Input id="pj-b" name="budget" type="number" min="0" step="0.01" defaultValue={record?.budget ?? ""} required /></div>
          <div className="space-y-2">
            <Label htmlFor="pj-s">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Project["status"])}>
              <SelectTrigger id="pj-s" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{(["planning", "active", "on_hold", "completed"] as const).map((x) => <SelectItem key={x} value={x}>{humanize(x)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-xl border bg-secondary/40 px-4 py-3 sm:col-span-2">
            <div><Label htmlFor="pj-open">Open for contributions</Label><p className="text-xs text-muted-foreground">Members, families, cells and organisations can give toward it</p></div>
            <Switch id="pj-open" checked={openGiving} onCheckedChange={setOpenGiving} />
          </div>
          {openGiving && (
            <>
              <div className="space-y-2"><Label htmlFor="pj-t">Giving goal ({CURRENCY})</Label><Input id="pj-t" name="target" type="number" min="0" step="0.01" defaultValue={record?.target ?? ""} placeholder="Same as budget" /></div>
              <div className="space-y-2"><Label htmlFor="pj-dl">Raise by</Label><Input id="pj-dl" name="deadline" type="date" defaultValue={record?.deadline ?? ""} /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="pj-f">Suggested amount per family (optional)</Label><Input id="pj-f" name="suggestedFamilyAmount" type="number" min="0" step="0.01" defaultValue={record?.suggestedFamilyAmount ?? ""} /><p className="text-xs text-muted-foreground">Each family&apos;s progress is shown against it.</p></div>
            </>
          )}
          <div className="space-y-2"><Label htmlFor="pj-sd">Start</Label><Input id="pj-sd" name="startDate" type="date" defaultValue={record?.startDate ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="pj-ed">Expected finish</Label><Input id="pj-ed" name="endDate" type="date" defaultValue={record?.endDate ?? ""} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="pj-m">Project chair / manager</Label><MemberPicker id="pj-m" name="managerMemberId" initial={record?.managerMemberId && record.manager ? { id: record.managerMemberId, name: record.manager } : null} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save project"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SpendDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [type, setType] = useState<"expense" | "income">("expense")
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    await post(`/projects/${project.id}/transactions`, { type, category: str(fd, "category"), amount: num(fd, "amount"), date: str(fd, "date"),
      description: str(fd, "description"), payee: str(fd, "payee"), paymentMethod: str(fd, "paymentMethod") })
    refreshProjects()
    onOpenChange(false)
  }, type === "expense" ? "Spending recorded" : "Income recorded")
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{project.name}</DialogTitle><DialogDescription>Recorded in Accounts and tagged to this project.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="flex gap-2 sm:col-span-2">
            {(["expense", "income"] as const).map((t) => (
              <Button key={t} type="button" variant={type === t ? "default" : "outline"} size="sm" onClick={() => setType(t)}>{t === "expense" ? "Money spent" : "Money received"}</Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sp-c">Category</Label>
            <Select name="category" defaultValue={type === "expense" ? "Building materials" : "Fundraising"} key={type}>
              <SelectTrigger id="sp-c" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{(type === "expense" ? EXPENSE_CATS : TRANSACTION_CATEGORIES.income).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="sp-a">Amount ({CURRENCY})</Label><Input id="sp-a" name="amount" type="number" min="0.01" step="0.01" required /><FieldError error={error} name="amount" /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="sp-d">What for</Label><Input id="sp-d" name="description" placeholder="e.g. 200 bags of cement" required /></div>
          <div className="space-y-2"><Label htmlFor="sp-p">{type === "expense" ? "Paid to" : "From"}</Label><Input id="sp-p" name="payee" /></div>
          <div className="space-y-2"><Label htmlFor="sp-dt">Date</Label><Input id="sp-dt" name="date" type="date" max={today()} defaultValue={today()} required /></div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sp-m">Method</Label>
            <Select name="paymentMethod" defaultValue="Bank Transfer">
              <SelectTrigger id="sp-m" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Record"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
