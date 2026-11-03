"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Droplets,
  Plus,
  Search,
  CalendarClock,
  GraduationCap,
  ScrollText,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  Printer,
  Flame,
  Baby,
  ClipboardCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, PersonAvatar, StatCard, TableCard, TableSkeleton } from "@/components/page"
import { Pager } from "@/components/pager"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { runAction } from "@/components/form"
import { BaptismFormDialog, refreshBaptisms } from "@/components/baptism-form-dialog"
import { RequirementsDialog, useCompleteCandidate } from "@/components/requirements-dialog"
import { del, patch, qs, useApi, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlParam } from "@/lib/use-url-param"
import { longDate, yearsSince } from "@/lib/format"
import { rite, ritesFor, useSettings } from "@/lib/settings"
import type { Baptism, BaptismStats, RiteKind } from "@/lib/types"
import { usePeriod } from "@/lib/period"
import { PeriodFilter, periodParams } from "@/components/period-filter"

const RITE_BADGE: Record<RiteKind, "info" | "gold" | "success"> = { baptism: "info", confirmation: "gold", dedication: "success" }
const RITE_ICON = { baptism: Droplets, confirmation: Flame, dedication: Baby }

export function BaptismsContent() {
  const { can } = useAuth()
  const canManage = can("members.manage")
  const settings = useSettings()
  const rites = ritesFor(settings.denomination)

  const [tab, setTab] = useState<"scheduled" | "completed">("scheduled")
  const [kind, setKind] = useState("all")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const period = usePeriod("all")
  useEffect(() => setPage(1), [period.range.from, period.range.to])
  const [selected, setSelected] = useState<Baptism | null>(null)
  const [dialog, setDialog] = useState<"new" | "edit" | "delete" | null>(null)

  useUrlParam("tab", (t) => (t === "scheduled" || t === "completed") && setTab(t))
  useUrlParam("q", (q) => {
    setSearchInput(q)
    setKind("all")
  })

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])
  useEffect(() => setPage(1), [tab, kind, search])

  const { data: stats } = useApi<BaptismStats>("/baptisms/stats")
  const { rows, meta, isLoading, error } = usePaginated<Baptism>(
    qs("/baptisms", { status: tab, kind, search, ...periodParams(period), page, perPage: 20 }),
  )

  const act = (b: Baptism, d: typeof dialog) => {
    setSelected(b)
    setDialog(d)
  }

  const { complete: completeCandidate, dialog: overrideDialog } = useCompleteCandidate(refreshBaptisms)
  const complete = (b: Baptism) => completeCandidate(b, `${b.name} recorded as ${rite(b.kind, settings.denomination).verb.toLowerCase()}`)
  const [checklistId, setChecklistId] = useState<string | null>(null)

  const title = { anglican: "Baptism & Confirmation", pentecostal: "Baptism & Dedication", other: "Sacraments" }[settings.denomination]

  const toolbar = (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <div className="relative sm:w-64">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Name, parent or certificate no…"
          className="h-9 pl-9"
          aria-label="Search register"
        />
      </div>
      <Select value={kind} onValueChange={setKind}>
        <SelectTrigger size="sm" className="sm:w-40" aria-label="Rite">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All rites</SelectItem>
          {rites.map((r) => (
            <SelectItem key={r.kind} value={r.kind}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <Page>
      <PageHeader
        eyebrow="Congregation"
        title={title}
        description="Candidates preparing for the sacraments, and the church's permanent register with certificates."
        actions={
          canManage && (
            <Button onClick={() => setDialog("new")}>
              <Plus className="size-4" />
              Register candidate
            </Button>
          )
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rites.slice(0, 2).map((r, i) => (
          <StatCard
            key={r.kind}
            label={`${r.verb} in ${stats?.year ?? new Date().getFullYear()}`}
            icon={RITE_ICON[r.kind]}
            tone={i === 0 ? "info" : "gold"}
            value={stats?.completedThisYear[r.kind].toLocaleString()}
            hint={r.plural}
          />
        ))}
        <StatCard
          label="Candidates"
          icon={GraduationCap}
          value={stats?.candidates.toLocaleString()}
          hint={stats && (stats.awaitingClass ? `${stats.awaitingClass} still to finish class` : "All have done class")}
        />
        <StatCard
          label="Next service"
          icon={CalendarClock}
          tone="success"
          value={stats ? (stats.nextDate ? longDate(stats.nextDate).replace(/,?\s\d{4}$/, "") : "None planned") : undefined}
          hint={stats?.nextDate ? daysAway(stats.nextDate) : "Register candidates to plan one"}
          valueClassName="text-xl md:text-2xl"
        />
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="scheduled">
            Candidates{stats ? <span className="tabular text-muted-foreground">{stats.candidates}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Register{stats ? <span className="tabular text-muted-foreground">{stats.totalRegistered}</span> : null}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <PeriodFilter period={period} allowAll label="Date" />
      </div>

      <TableCard
        title={tab === "scheduled" ? "Preparing" : "Register"}
        count={meta?.total}
        actions={toolbar}
        footer={meta && meta.total > 0 && <Pager meta={meta} onPage={setPage} />}
      >
        {error && <p className="px-6 pt-4 text-sm text-destructive">{error.message}</p>}
        {isLoading && !meta ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={tab === "scheduled" ? GraduationCap : ScrollText}
            title={tab === "scheduled" ? "No candidates right now" : "The register is empty"}
            description={
              tab === "scheduled"
                ? "Register people preparing for baptism or confirmation to track their class and service date."
                : "Completed baptisms and confirmations appear here with their certificate numbers."
            }
            action={
              canManage && (
                <Button variant="outline" onClick={() => setDialog("new")}>
                  <Plus className="size-4" /> Register candidate
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {tab === "completed" && <TableHead>Cert. no</TableHead>}
                <TableHead>Name</TableHead>
                <TableHead>Rite</TableHead>
                <TableHead className="hidden md:table-cell">{tab === "scheduled" ? "Planned for" : "Date"}</TableHead>
                <TableHead className="hidden lg:table-cell">{tab === "scheduled" ? "Godparents / sponsors" : "Officiant"}</TableHead>
                {tab === "scheduled" && <TableHead>Requirements</TableHead>}
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => {
                const r = rite(b.kind, settings.denomination)
                const age = yearsSince(b.dateOfBirth)
                const parents = [b.fatherName, b.motherName].filter(Boolean).join(" & ")
                return (
                  <TableRow key={b.id}>
                    {tab === "completed" && (
                      <TableCell className="font-mono text-xs text-muted-foreground">{b.certificateNumber}</TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <PersonAvatar name={b.name} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-semibold">
                            {b.name}
                            {b.memberId && <Badge variant="muted">Member</Badge>}
                          </p>
                          <p className="max-w-64 truncate text-xs text-muted-foreground">
                            {age !== null ? `${age === 0 ? "Infant" : `${age} yrs`}` : ""}
                            {age !== null && parents ? " · " : ""}
                            {parents && `Child of ${parents}`}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={RITE_BADGE[b.kind]}>{r.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm">{longDate(b.date)}</p>
                      {tab === "scheduled" && <p className="text-xs text-muted-foreground">{daysAway(b.date)}</p>}
                    </TableCell>
                    <TableCell className="hidden max-w-56 truncate text-sm text-muted-foreground lg:table-cell">
                      {(tab === "scheduled" ? b.sponsors : b.officiant) ?? "—"}
                    </TableCell>
                    {tab === "scheduled" && (
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setChecklistId(b.id)}
                          className="group/req flex w-32 flex-col gap-1 text-left"
                          title="Open checklist"
                        >
                          <span className="flex items-center justify-between text-xs">
                            <span className={b.requirementsDone === b.requirementsTotal ? "font-semibold text-success" : "font-medium"}>
                              {b.requirementsDone === b.requirementsTotal ? "Ready" : `${b.requirementsDone}/${b.requirementsTotal} done`}
                            </span>
                            <ClipboardCheck className="size-3.5 text-muted-foreground group-hover/req:text-primary" />
                          </span>
                          <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <span
                              className={`block h-full rounded-full ${b.requirementsDone === b.requirementsTotal ? "bg-success" : "bg-primary"}`}
                              style={{ width: `${b.requirementsTotal ? (b.requirementsDone / b.requirementsTotal) * 100 : 0}%` }}
                            />
                          </span>
                        </button>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${b.name}`}
                            className="opacity-60 group-hover/row:opacity-100 data-[state=open]:opacity-100"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {b.status === "completed" && (
                            <DropdownMenuItem asChild>
                              <Link href={`/baptisms/certificate?id=${b.id}`} target="_blank">
                                <Printer className="size-4" /> Print certificate
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {b.status === "scheduled" && (
                            <DropdownMenuItem onClick={() => setChecklistId(b.id)}>
                              <ClipboardCheck className="size-4" /> Requirements checklist
                            </DropdownMenuItem>
                          )}
                          {canManage && b.status === "scheduled" && (
                            <DropdownMenuItem onClick={() => complete(b)}>
                              <CheckCircle2 className="size-4" /> Mark {r.verb.toLowerCase()}
                            </DropdownMenuItem>
                          )}
                          {canManage && (
                            <>
                              <DropdownMenuItem onClick={() => act(b, "edit")}>
                                <Pencil className="size-4" /> Edit details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => act(b, "delete")}>
                                <Trash2 className="size-4" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </TableCard>

      {overrideDialog}
      {checklistId && <RequirementsDialog id={checklistId} open onOpenChange={(o) => !o && setChecklistId(null)} />}
      <BaptismFormDialog
        key={`new-${tab}`}
        open={dialog === "new"}
        onOpenChange={(o) => !o && setDialog(null)}
        defaultKind={kind !== "all" ? (kind as RiteKind) : undefined}
      />
      {selected && (
        <>
          <BaptismFormDialog
            key={`edit-${selected.id}`}
            record={selected}
            open={dialog === "edit"}
            onOpenChange={(o) => !o && setDialog(null)}
          />
          <ConfirmDialog
            open={dialog === "delete"}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Delete register entry"
            description={
              <>
                Delete the {rite(selected.kind, settings.denomination).label.toLowerCase()} record for{" "}
                <span className="font-semibold">{selected.name}</span>
                {selected.certificateNumber ? ` (${selected.certificateNumber})` : ""}? This cannot be undone.
              </>
            }
            onConfirm={async () => {
              const ok = await runAction(() => del(`/baptisms/${selected.id}`), "Entry deleted")
              if (ok) refreshBaptisms()
              return ok
            }}
          />
        </>
      )}
    </Page>
  )
}

function daysAway(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number)
  const now = new Date()
  const diff = Math.round((new Date(y, m - 1, d).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff > 0) return `In ${diff} days`
  return `${-diff} days ago`
}
