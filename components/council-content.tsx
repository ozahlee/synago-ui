"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { mutate } from "swr"
import { AlertTriangle, ArrowRightLeft, ChevronDown, ChevronRight, Contact, Copy, Cross, Download, Hourglass, KeyRound, LogOut, Network, PauseCircle, Pencil, PlayCircle, Plus, Printer, RotateCcw, ShieldAlert, Trash2, TrendingUp, UserPlus, UserRound, UserX, Users } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { ContactIcons, ContactLines } from "@/components/contact-buttons"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState, Page, PageHeader } from "@/components/page"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { MemberPicker } from "@/components/member-picker"
import { runAction } from "@/components/form"
import { del, patch, photoSrc, post, qs, useApi } from "@/lib/api"
import { PhotoUpload } from "@/components/photo-upload"
import { useAuth } from "@/lib/auth"
import { useUrlParam } from "@/lib/use-url-param"
import { date, initials, today } from "@/lib/format"
import type { Council, CouncilBody, CouncilCheck, CouncilEvent, CouncilHolder, CouncilOffice, Ministry } from "@/lib/types"
import { cn } from "@/lib/utils"

const refresh = () => mutate((k) => typeof k === "string" && k.startsWith("/council"))
const KIND: Record<CouncilBody["kind"], string> = { clergy: "Clergy", council: "Council", committee: "Committee", organisation: "Organisation", board: "Board" }
const FILLED: Record<CouncilOffice["filledBy"], string> = { elected: "Elected", appointed: "Appointed", ex_officio: "Ex officio" }
const monthYear = (d: string | null) => (d ? new Date(`${d}T00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "")

/** Offices of a body as a tree by who reports to whom (a seat reporting outside the body starts a branch). */
export function officeTree(body: CouncilBody) {
  const ids = new Set(body.offices.map((o) => o.id))
  const kids = new Map<string | null, CouncilOffice[]>()
  for (const o of body.offices) {
    const parent = o.reportsTo && ids.has(o.reportsTo) ? o.reportsTo : null
    kids.set(parent, [...(kids.get(parent) ?? []), o])
  }
  return kids
}

/** The church council organogram: who sits where, which seats are empty and whose term ends soon. */
export function CouncilContent() {
  const { can } = useAuth()
  const manage = can("council.manage")
  const [asOf, setAsOf] = useState(today())
  const { data, isLoading } = useApi<Council>(qs("/council", { asOf: asOf === today() ? undefined : asOf }))
  const [picked, setPicked] = useState<string | null>(null)
  useUrlParam("body", setPicked)
  const [office, setOffice] = useState<CouncilOffice | null>(null)
  const [mode, setMode] = useState<"chart" | "directory">("chart")
  const [showChecks, setShowChecks] = useState(false)
  useUrlParam("show", (v) => v === "checks" && setShowChecks(true))
  const { data: checks } = useApi<CouncilCheck[]>(data && !data.templates ? `/council/checks` : null)
  const [editing, setEditing] = useState<{ kind: "body"; body: CouncilBody | null; parentId: string | null } | { kind: "office"; office: CouncilOffice | null; bodyId: string } | null>(null)

  const bodies = data?.bodies ?? []
  const byId = useMemo(() => new Map(bodies.map((b) => [b.id, b])), [bodies])
  const root = bodies.find((b) => b.kind === "council") ?? bodies.find((b) => !b.parentId) ?? null
  const current = (picked && byId.get(picked)) || root
  const children = bodies.filter((b) => b.parentId === current?.id)
  const path: CouncilBody[] = []
  for (let b = current; b; b = b.parentId ? byId.get(b.parentId) ?? null : null) path.unshift(b)
  const allOffices = bodies.flatMap((b) => b.offices.map((o) => ({ ...o, bodyName: b.name })))
  const totals = { vacant: bodies.reduce((s, b) => s + b.stats.vacant, 0), ending: bodies.reduce((s, b) => s + b.stats.endingSoon, 0) }

  return (
    <Page>
      <PageHeader eyebrow="People" title="Church administration" description="The clergy, the council, its committees and the church's organisations: who holds each seat, which are empty, and whose term ends soon."
        actions={<>
          <div className="flex items-center gap-2">
            <Label htmlFor="as-of" className="text-xs text-muted-foreground">As at</Label>
            <Input id="as-of" type="date" value={asOf} onChange={(e) => e.target.value && setAsOf(e.target.value)} className="h-9 w-40" />
            {asOf !== today() && <Button size="icon" variant="ghost" className="size-9" onClick={() => setAsOf(today())} aria-label="Back to today"><RotateCcw className="size-4" /></Button>}
          </div>
          <Button variant="outline" asChild><Link href={`/council/print?asOf=${asOf}`} target="_blank"><Printer className="size-4" /> Print</Link></Button>
        </>} />

      {isLoading || !data ? <div className="h-96 animate-pulse rounded-2xl bg-muted" /> : data.templates ? (
        <StartCard templates={data.templates} manage={manage} />
      ) : current && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="radiogroup" aria-label="View" className="inline-flex rounded-lg border bg-card p-0.5 text-sm shadow-soft">
              {(["chart", "directory"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                  className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition", mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {m === "chart" ? <Network className="size-4" /> : <Contact className="size-4" />}{m === "chart" ? "Organogram" : "Contacts"}
                </button>
              ))}
            </div>
            {asOf === today() && <ChecksSummary checks={checks} totals={totals} open={showChecks} onToggle={() => setShowChecks(!showChecks)} />}
          </div>
          {showChecks && checks && asOf === today() && (
            <ChecksPanel checks={checks} onOpen={(c) => {
              if (c.bodyId) setPicked(c.bodyId)
              const o = bodies.flatMap((b) => b.offices).find((x) => x.id === c.officeId)
              if (o && mode === "chart") setOffice(o)
            }} />
          )}
          {mode === "directory" ? <Directory bodies={bodies} /> : <>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* the structure, as a tree of bodies */}
            <aside className="min-w-0 lg:col-span-3">
              <div className="lg:hidden">
                <Select value={current.id} onValueChange={(x) => x && setPicked(x)}>
                  <SelectTrigger className="w-full" aria-label="Body"><SelectValue /></SelectTrigger>
                  <SelectContent>{bodies.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}{b.stats.vacant ? ` · ${b.stats.vacant} vacant` : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Card className="hidden gap-0 py-2 lg:flex">
                <p className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Structure</p>
                <BodyTree bodies={bodies} parentId={null} current={current.id} onPick={setPicked} depth={0} />
                {manage && <Button variant="ghost" size="sm" className="mx-2 mt-1 justify-start text-xs" onClick={() => setEditing({ kind: "body", body: null, parentId: current.id })}><Plus className="size-3.5" /> Add a committee</Button>}
              </Card>
              <div className="hidden lg:block"><ActivityFeed /></div>
            </aside>

            <section className="min-w-0 space-y-6 lg:col-span-9">
              <Card className="gap-0 overflow-hidden py-0">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
                  <div className="min-w-0">
                    <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Where in the structure">
                      {path.map((b, i) => (
                        <span key={b.id} className="inline-flex items-center gap-1">
                          {i > 0 && <ChevronRight className="size-3" />}
                          {b.id === current.id ? <span>{KIND[b.kind]}</span> : <button type="button" className="hover:text-foreground hover:underline" onClick={() => setPicked(b.id)}>{b.name}</button>}
                        </span>
                      ))}
                    </nav>
                    <h2 className="mt-0.5 text-xl font-semibold">{current.name}</h2>
                    {current.description && <p className="text-sm text-muted-foreground">{current.description}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={current.stats.vacant ? "warning" : "success"}>{current.stats.vacant ? `${current.stats.vacant} vacant` : "All seats filled"}</Badge>
                    {manage && <>
                      <Button size="sm" variant="outline" onClick={() => setEditing({ kind: "office", office: null, bodyId: current.id })}><Plus className="size-4" /> Seat</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ kind: "body", body: current, parentId: current.parentId })} aria-label="Edit body"><Pencil className="size-4" /></Button>
                    </>}
                  </div>
                </div>
                {current.offices.length === 0 ? (
                  <EmptyState icon={Users} title="No seats yet" description={manage ? "Add the seats this body has: chairperson, secretary, members…" : "No seats have been set up."} />
                ) : (
                  <>
                    <div className="hidden overflow-x-auto p-6 md:block"><OrgChart body={current} onOpen={setOffice} /></div>
                    <div className="md:hidden"><OrgList body={current} onOpen={setOffice} /></div>
                  </>
                )}
              </Card>

              {children.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Under {current.name}</p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {children.map((b) => (
                      <button key={b.id} type="button" onClick={() => setPicked(b.id)}
                        className="group rounded-2xl border bg-card p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{KIND[b.kind]}</p>
                        <p className="mt-0.5 font-semibold">{b.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{b.stats.chair ? `Chair: ${b.stats.chair}` : "No chairperson yet"}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <Badge variant={b.stats.vacant ? "warning" : "muted"}>{b.stats.vacant ? `${b.stats.vacant} vacant` : `${b.stats.seats} seat${b.stats.seats === 1 ? "" : "s"} filled`}</Badge>
                          {b.stats.endingSoon > 0 && <Badge variant="outline"><Hourglass className="size-3" /> {b.stats.endingSoon} ending</Badge>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
          </>}
        </>
      )}

      {office && <OfficeDialog office={office} all={allOffices} bodyName={byId.get(bodies.find((b) => b.offices.some((o) => o.id === office.id))?.id ?? "")?.name ?? ""} manage={manage}
        onClose={() => setOffice(null)} onEdit={() => { const b = bodies.find((x) => x.offices.some((o) => o.id === office.id)); setOffice(null); if (b) setEditing({ kind: "office", office, bodyId: b.id }) }} />}
      {editing?.kind === "body" && <BodyForm body={editing.body} parentId={editing.parentId} bodies={bodies} onClose={() => setEditing(null)} onSaved={(id) => (setEditing(null), setPicked(id))}
        onDeleted={() => { setEditing(null); setPicked(editing.body?.parentId ?? null) }} />}
      {editing?.kind === "office" && <OfficeForm office={editing.office} body={byId.get(editing.bodyId)!} all={allOffices} onClose={() => setEditing(null)} />}
    </Page>
  )
}

const CHECK_ICON = { ending: Hourglass, vacant: UserRound, limit: AlertTriangle, conflict: AlertTriangle, load: Users, suspended: PauseCircle, accessMissing: KeyRound, accessStale: ShieldAlert } as const

function ChecksSummary({ checks, totals, open, onToggle }: { checks: CouncilCheck[] | undefined; totals: { vacant: number; ending: number }; open: boolean; onToggle: () => void }) {
  const n = (t: CouncilCheck["type"][]) => checks?.filter((c) => t.includes(c.type)).length ?? 0
  const parts = [
    totals.ending && `${n(["ending"])} term${n(["ending"]) === 1 ? "" : "s"} ending, nobody lined up`,
    n(["vacant"]) && `${n(["vacant"])} vacanc${n(["vacant"]) === 1 ? "y" : "ies"}`,
    n(["suspended", "limit", "conflict", "load"]) && `${n(["suspended", "limit", "conflict", "load"])} governance`,
    n(["accessMissing", "accessStale"]) && `${n(["accessMissing", "accessStale"])} access`,
  ].filter(Boolean)
  if (!parts.length) return totals.vacant ? null : <p className="text-sm text-success">All seats filled and in order.</p>
  const urgent = checks?.some((c) => c.severity !== "info")
  return (
    <button type="button" onClick={onToggle} aria-expanded={open}
      className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border px-3 py-1.5 text-sm transition hover:border-primary/40", urgent ? "border-warning/40 bg-warning/[0.06]" : "bg-card")}>
      <AlertTriangle className={cn("size-4", urgent ? "text-warning" : "text-muted-foreground")} />
      <span>{parts.join(" · ")}</span>
      <span className="text-primary">{open ? "Hide" : "Review"}</span>
    </button>
  )
}

/** Everything to sort out, grouped, each opening the seat it is about. */
function ChecksPanel({ checks, onOpen }: { checks: CouncilCheck[]; onOpen: (c: CouncilCheck) => void }) {
  const groups: Array<[string, CouncilCheck["type"][]]> = [["Terms ending", ["ending"]], ["App access", ["accessStale", "accessMissing"]], ["Governance", ["suspended", "limit", "conflict", "load"]], ["Vacant seats", ["vacant"]]]
  const rank = { danger: 0, warning: 1, info: 2 }
  return (
    <Card className="gap-0 py-0">
      <div className="gap-0 md:columns-2 [column-rule:1px_solid_var(--border)]">
        {groups.map(([label, types]) => {
          const rows = checks.filter((c) => types.includes(c.type)).sort((a, b) => rank[a.severity] - rank[b.severity] || (a.date ?? "").localeCompare(b.date ?? ""))
          if (!rows.length) return null
          return (
            <section key={label} className="break-inside-avoid border-b p-4 last:border-b-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label} · {rows.length}</p>
              <ul className="space-y-1.5">
                {rows.slice(0, 8).map((c, i) => {
                  const Icon = CHECK_ICON[c.type]
                  const access = c.type.startsWith("access")
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Icon className={cn("mt-0.5 size-4 shrink-0", c.severity === "danger" ? "text-destructive" : c.severity === "warning" ? "text-warning" : "text-muted-foreground")} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.detail}</p>
                      </div>
                      {access ? <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" asChild><Link href="/staff">Staff & access</Link></Button>
                        : c.officeId && <Button size="sm" variant="ghost" className="h-7 shrink-0 text-xs" onClick={() => onOpen(c)}>Open</Button>}
                    </li>
                  )
                })}
                {rows.length > 8 && <li className="pl-6 text-xs text-muted-foreground">+{rows.length - 8} more</li>}
              </ul>
            </section>
          )
        })}
      </div>
    </Card>
  )
}

/** Everyone holding a seat, with their phone, email and address, ready to call, copy or export. */
function Directory({ bodies }: { bodies: CouncilBody[] }) {
  const [scope, setScope] = useState("all")
  const [q, setQ] = useState("")
  const rows = bodies.filter((b) => scope === "all" || b.id === scope).flatMap((b) => b.offices.flatMap((o) =>
    o.holders.map((h) => ({ key: `${o.id}-${h.positionId}-${b.id}`, body: b.name, seat: o.title, h, viaEx: o.filledBy === "ex_officio" }))))
    .filter((r) => !q || `${r.h.name} ${r.seat} ${r.body} ${r.h.phone ?? ""}`.toLowerCase().includes(q.toLowerCase()))
  // one line per person for copying: the same person in several seats is listed once
  const people = [...new Map(rows.map((r) => [r.h.memberId, r.h])).values()]
  const copy = (what: "phone" | "email") => {
    const list = people.map((h) => h[what]).filter(Boolean).join(what === "phone" ? ", " : "; ")
    if (!list) return toast.error(`No ${what === "phone" ? "phone numbers" : "emails"} to copy`)
    navigator.clipboard?.writeText(list).then(() => toast.success(`Copied ${list.split(/[,;] /).length} ${what === "phone" ? "numbers" : "emails"}`))
  }
  const csv = () => {
    const esc = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`
    const body = [["Body", "Seat", "Name", "Phone", "Email", "Address", "Since", "Until"].join(","),
      ...rows.map((r) => [r.body, r.seat, r.h.name, r.h.phone, r.h.email, r.h.address, r.h.startDate, r.h.endDate].map(esc).join(","))].join("\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }))
    a.download = "church-council-contacts.csv"
    a.click()
  }
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, seat or phone…" className="h-9 w-56" aria-label="Search" />
        <Select value={scope} onValueChange={(v) => v && setScope(v)}>
          <SelectTrigger className="h-9 w-60" aria-label="Body"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">The whole structure</SelectItem>{bodies.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{people.length} {people.length === 1 ? "person" : "people"}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => copy("phone")}><Copy className="size-3.5" /> Copy phones</Button>
          <Button size="sm" variant="outline" onClick={() => copy("email")}><Copy className="size-3.5" /> Copy emails</Button>
          <Button size="sm" variant="outline" onClick={csv}><Download className="size-3.5" /> CSV</Button>
        </div>
      </div>
      {rows.length === 0 ? <EmptyState icon={Contact} title="Nobody here yet" description="Fill seats on the organogram and they appear here." /> : (
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.key} className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto]">
              <div className="flex min-w-0 items-center gap-3">
                <PassportPhoto url={r.h.photoUrl} name={r.h.name} className="w-10" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.h.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.seat} · {r.body}{r.viaEx ? " (ex officio)" : ""}</p>
                </div>
              </div>
              <p className="hidden text-xs text-muted-foreground sm:block">{r.h.endDate ? `until ${date(r.h.endDate)}` : r.h.startDate ? `since ${date(r.h.startDate)}` : ""}</p>
              <ContactLines phone={r.h.phone} email={r.h.email} address={r.h.address} />
              <ContactIcons phone={r.h.phone} email={r.h.email} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function StartCard({ templates, manage }: { templates: Record<string, string>; manage: boolean }) {
  return (
    <Card className="py-0">
      <EmptyState icon={Network} title="Set up the council" description={manage ? "Start from a ready structure and adjust it, or start blank." : "The council structure hasn't been set up yet."} />
      {manage && (
        <div className="flex flex-wrap justify-center gap-2 pb-8">
          {Object.entries(templates).map(([k, label], i) => (
            <Button key={k} variant={i === 0 ? "default" : "outline"} onClick={async () => { if (await runAction(() => post("/council/template", { template: k }), "Council set up")) refresh() }}>{label}</Button>
          ))}
        </div>
      )}
    </Card>
  )
}

function BodyTree({ bodies, parentId, current, onPick, depth }: { bodies: CouncilBody[]; parentId: string | null; current: string; onPick: (id: string) => void; depth: number }) {
  const mine = bodies.filter((b) => b.parentId === parentId)
  if (!mine.length) return null
  return (
    <ul>
      {mine.map((b) => (
        <li key={b.id}>
          <button type="button" onClick={() => onPick(b.id)} style={{ paddingLeft: 16 + depth * 14 }}
            className={cn("flex w-full items-center gap-2 py-1.5 pr-3 text-left text-sm transition hover:bg-muted/60", b.id === current && "bg-primary/8 font-semibold text-primary")}>
            <span className="min-w-0 flex-1 truncate">{b.name}</span>
            {b.stats.vacant > 0 && <span className="shrink-0 rounded-full bg-warning/15 px-1.5 text-[11px] font-semibold tabular text-[color-mix(in_oklch,var(--warning)_70%,black)] dark:text-warning" title="Vacant seats">{b.stats.vacant}</span>}
          </button>
          <BodyTree bodies={bodies} parentId={b.id} current={current} onPick={onPick} depth={depth + 1} />
        </li>
      ))}
    </ul>
  )
}

/**
 * A classic top-down tree drawn with borders (prints cleanly); kept with the chart so it always loads.
 * Classes are explicit so the lists inside a card are left alone.
 */
const ORG_CSS = `
.org-level { display: flex; justify-content: center; padding-top: 1.25rem; position: relative; margin: 0; }
.org-root { padding-top: 0; }
.org-node { display: flex; flex-direction: column; align-items: center; position: relative; padding: 1.25rem 0.375rem 0; list-style: none; }
.org-root > .org-node { padding-top: 0; }
.org-node::before, .org-node::after { content: ""; position: absolute; top: 0; right: 50%; width: 50%; height: 1.25rem; border-top: 1.5px solid var(--border); }
.org-node::after { right: auto; left: 50%; border-left: 1.5px solid var(--border); }
.org-node:only-child::before, .org-node:only-child::after { display: none; }
.org-node:only-child { padding-top: 0; }
.org-node:first-child::before, .org-node:last-child::after { border: 0 none; }
.org-node:last-child::before { border-right: 1.5px solid var(--border); border-top-right-radius: 8px; }
.org-node:first-child::after { border-top-left-radius: 8px; }
.org-level .org-level::before { content: ""; position: absolute; top: 0; left: 50%; height: 1.25rem; border-left: 1.5px solid var(--border); }
.org-root > .org-node > .org-level:has(> .org-node:only-child)::before, .org-level .org-level:has(> .org-node:only-child)::before { height: 1.25rem; }
.org-stack { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.625rem; }
.org-stack::before { content: ""; position: absolute; top: 0; bottom: 1.5rem; left: 50%; border-left: 1.5px solid var(--border); }
.org-stack > * { position: relative; }
@media print { .org-node::before, .org-node::after, .org-level .org-level::before, .org-stack::before { border-color: #999; } }
`

/**
 * The top-down chart; also used on the printed organogram. Seats with nobody under them are stacked
 * in one column under their parent, so a chair with seven direct seats stays readable.
 */
export function OrgChart({ body, onOpen, print }: { body: CouncilBody; onOpen?: (o: CouncilOffice) => void; print?: boolean }) {
  const kids = officeTree(body)
  const card = (o: CouncilOffice) => <SeatCard o={o} onOpen={onOpen} print={print} />
  const branch = (parent: string | null): React.ReactNode => {
    const list = kids.get(parent) ?? []
    if (!list.length) return null
    const leaves = list.filter((o) => !(kids.get(o.id) ?? []).length)
    const stacked = leaves.length >= 3 || (leaves.length >= 2 && list.length > leaves.length)
    const branches = stacked ? list.filter((o) => !leaves.includes(o)) : list
    return (
      <ul className={cn("org-level", parent === null && "org-root")}>
        {branches.map((o) => <li key={o.id} className="org-node">{card(o)}{branch(o.id)}</li>)}
        {stacked && <li className="org-node"><div className="org-stack">{leaves.map((o) => <div key={o.id}>{card(o)}</div>)}</div></li>}
      </ul>
    )
  }
  return <div className="mx-auto w-max min-w-full"><style>{ORG_CSS}</style>{branch(null)}</div>
}

/** A passport-proportioned photo (4:5), or the person's initials in the same frame. */
export function PassportPhoto({ url, name, className }: { url: string | null; name: string | null; className?: string }) {
  const src = photoSrc(url)
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/10 text-primary aspect-[4/5]", !name && "border border-dashed border-muted-foreground/30 bg-transparent text-muted-foreground/50", className)}>
      {src ? <img src={src} alt={name ?? ""} loading="lazy" className="size-full object-cover object-top" />
        : name ? <span className="text-xs font-semibold">{initials(name)}</span> : <UserRound className="size-1/2" />}
    </span>
  )
}

function SeatCard({ o, onOpen, print }: { o: CouncilOffice; onOpen?: (o: CouncilOffice) => void; print?: boolean }) {
  const empty = o.holders.length === 0
  const ending = o.holders.some((h) => h.endsSoon)
  const over = o.holders.some((h) => h.overLimit)
  const one = o.holders.length === 1 && o.seats === 1
  return (
    <div role={onOpen ? "button" : undefined} tabIndex={onOpen ? 0 : undefined} onClick={onOpen ? () => onOpen(o) : undefined}
      onKeyDown={onOpen ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(o) } } : undefined}
      className={cn("relative w-52 rounded-xl border bg-card p-2.5 text-left transition", onOpen && "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-primary",
        empty && o.filledBy !== "ex_officio" && "border-dashed bg-[color-mix(in_oklch,var(--muted)_45%,var(--card))]", ending && !print && "border-warning/50", print && "w-48 break-inside-avoid shadow-none")}>
      <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground" title={o.title}>{o.title}{o.seats > 1 ? ` (${o.seats})` : ""}</p>
      {empty ? (
        <div className="mt-2 flex items-center gap-2.5">
          <PassportPhoto url={null} name={null} className="w-12" />
          <p className="text-sm italic text-muted-foreground">{o.filledBy === "ex_officio" ? `${o.exOfficioOf?.title ?? "—"}, when filled` : "Vacant"}</p>
        </div>
      ) : one ? (
        <div className="mt-2 flex items-center gap-2.5">
          <PassportPhoto url={o.holders[0].photoUrl} name={o.holders[0].name} className={cn("w-14", o.holders[0].suspension && "opacity-50 grayscale")} />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug [overflow-wrap:anywhere]">{o.holders[0].name}</p>
            {o.holders[0].startDate && <p className="mt-0.5 text-[11px] text-muted-foreground">since {monthYear(o.holders[0].startDate)}</p>}
            {!print && <ContactIcons phone={o.holders[0].phone} email={o.holders[0].email} size="xs" className="mt-1" />}
            {print && o.holders[0].phone && <p className="mt-0.5 text-[11px] tabular">{o.holders[0].phone}</p>}
          </div>
        </div>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {o.holders.slice(0, 5).map((h) => (
            <li key={h.positionId} className="flex items-center gap-2">
              <PassportPhoto url={h.photoUrl} name={h.name} className={cn("w-8", h.suspension && "opacity-50 grayscale")} />
              <span className="min-w-0 flex-1 text-[13px] font-medium leading-tight [overflow-wrap:anywhere]">
                {h.name}
                {(h.acting || h.suspension) && <span className={cn("block text-[10.5px] font-normal", h.suspension ? "text-destructive" : "text-info")}>{h.suspension ? "Suspended" : "Acting"}</span>}
              </span>
              {!print && h.phone && <ContactIcons phone={h.phone} size="xs" />}
            </li>
          ))}
          {o.holders.length > 5 && <li className="pl-10 text-xs text-muted-foreground">+{o.holders.length - 5} more</li>}
          {o.vacant > 0 && <li className="flex items-center gap-2"><PassportPhoto url={null} name={null} className="w-8" /><span className="text-xs italic text-muted-foreground">{o.vacant} vacant</span></li>}
        </ul>
      )}
      <div className="mt-1.5 flex flex-wrap gap-1 text-[10.5px] empty:hidden">
        {o.filledBy === "ex_officio" && <span className="rounded bg-muted px-1 text-muted-foreground">Ex officio</span>}
        {ending && <span className="inline-flex items-center gap-0.5 rounded bg-warning/15 px-1 text-[color-mix(in_oklch,var(--warning)_70%,black)] dark:text-warning"><Hourglass className="size-2.5" /> ends {monthYear(o.holders.find((h) => h.endsSoon)!.endDate)}</span>}
        {over && <span className="rounded bg-destructive/10 px-1 text-destructive">Over term limit</span>}
        {o.holders.some((h) => h.acting) && <span className="rounded bg-info/10 px-1 text-info">Acting</span>}
        {o.holders.some((h) => h.suspension) && <span className="rounded bg-destructive/10 px-1 font-semibold text-destructive">Suspended</span>}
      </div>
    </div>
  )
}

/** On a phone: the same tree as an indented list. */
function OrgList({ body, onOpen }: { body: CouncilBody; onOpen: (o: CouncilOffice) => void }) {
  const kids = officeTree(body)
  const rows: Array<{ o: CouncilOffice; depth: number }> = []
  const walk = (p: string | null, depth: number) => (kids.get(p) ?? []).forEach((o) => { rows.push({ o, depth }); walk(o.id, depth + 1) })
  walk(null, 0)
  return (
    <ul className="divide-y">
      {rows.map(({ o, depth }) => (
        <li key={o.id}>
          <button type="button" onClick={() => onOpen(o)} className="flex w-full items-center gap-3 py-2.5 pr-4 text-left" style={{ paddingLeft: 16 + depth * 16 }}>
            <PassportPhoto url={o.holders[0]?.photoUrl ?? null} name={o.holders[0]?.name ?? null} className="w-9" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{o.title}</p>
              <p className={cn("truncate text-sm", o.holders.length ? "font-medium" : "italic text-muted-foreground")}>{o.holders.length ? o.holders.map((h) => h.name).join(", ") : o.filledBy === "ex_officio" ? `${o.exOfficioOf?.title}, when filled` : "Vacant"}</p>
            </div>
            {o.vacant > 0 && o.holders.length > 0 && <Badge variant="warning">{o.vacant} vacant</Badge>}
            {o.holders.some((h) => h.endsSoon) && <Hourglass className="size-4 shrink-0 text-warning" />}
          </button>
        </li>
      ))}
    </ul>
  )
}

export const END_REASON: Record<string, { label: string; tone: string }> = {
  completed: { label: "Completed term", tone: "bg-muted text-muted-foreground" },
  resigned: { label: "Resigned", tone: "bg-warning/15 text-[color-mix(in_oklch,var(--warning)_70%,black)] dark:text-warning" },
  died: { label: "Called to glory ✝", tone: "bg-foreground/10 text-foreground" },
  removed: { label: "Removed", tone: "bg-destructive/10 text-destructive" },
  promoted: { label: "Promoted", tone: "bg-success/12 text-success" },
  moved: { label: "Moved", tone: "bg-info/10 text-info" },
  other: { label: "Ended", tone: "bg-muted text-muted-foreground" },
}

function OfficeDialog({ office, bodyName, manage, all, onClose, onEdit }: { office: CouncilOffice; bodyName: string; manage: boolean; all: Array<CouncilOffice & { bodyName: string }>; onClose: () => void; onEdit: () => void }) {
  const { data: history, mutate: reload } = useApi<CouncilHolder[]>(`/council/offices/${office.id}/history`)
  const canPhoto = useAuth().can("members.manage")
  const [adding, setAdding] = useState(false)
  const [ending, setEnding] = useState<CouncilHolder | null>(null)
  const [suspending, setSuspending] = useState<CouncilHolder | null>(null)
  const [moving, setMoving] = useState<CouncilHolder | null>(null)
  const [removing, setRemoving] = useState<CouncilHolder | null>(null)
  const done = () => (reload(), refresh())
  const current = new Set(office.holders.map((h) => h.positionId))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>{office.title}</DialogTitle>
          <DialogDescription>
            {bodyName} · {FILLED[office.filledBy]}{office.filledBy === "ex_officio" && office.exOfficioOf ? `: whoever is ${office.exOfficioOf.title}${office.exOfficioOf.body ? ` (${office.exOfficioOf.body})` : ""}` : ""}
            {office.seats > 1 ? ` · ${office.seats} seats` : ""}{office.termYears ? ` · ${office.termYears}-year term` : ""}{office.maxTerms ? `, up to ${office.maxTerms} in a row` : ""}
          </DialogDescription>
        </DialogHeader>
        {office.note && <p className="rounded-xl bg-muted px-3 py-2 text-sm">{office.note}</p>}

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Now</p>
          {office.holders.length === 0 ? <p className="text-sm italic text-muted-foreground">{office.filledBy === "ex_officio" ? `Filled when someone is ${office.exOfficioOf?.title}.` : "Vacant."}</p> : (
            <ul className="divide-y rounded-xl border">
              {office.holders.map((h) => (
                <li key={h.positionId} className="flex items-start gap-3 px-3 py-2.5">
                  <PassportPhoto url={h.photoUrl} name={h.name} className="w-12" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/members?q=${encodeURIComponent(h.name)}`} className="font-medium hover:underline">{h.name}</Link>
                    <p className="text-xs text-muted-foreground">
                      {h.via ? `as ${h.via}` : <>{h.startDate ? `since ${date(h.startDate)}` : ""}{h.endDate ? ` · until ${date(h.endDate)}` : ""}{office.maxTerms ? ` · term ${h.term} of ${office.maxTerms}` : ""}{h.acting ? " · acting" : ""}</>}
                    </p>
                    {h.overLimit && <p className="text-xs text-destructive">Beyond the {office.maxTerms}-term limit</p>}
                    {h.suspension && (
                      <div className="mt-1.5 rounded-lg border border-destructive/25 bg-destructive/[0.05] px-2.5 py-1.5 text-xs">
                        <p className="font-semibold text-destructive">Suspended since {date(h.suspension.since)}{h.suspension.until ? ` until ${date(h.suspension.until)}` : ""}</p>
                        <p className="text-muted-foreground">{h.suspension.reason}</p>
                        {manage && <button type="button" className="mt-0.5 font-medium text-primary hover:underline" onClick={async () => { if (await runAction(() => post(`/council/suspensions/${h.suspension!.id}/lift`, { date: today() }), "Suspension lifted")) done() }}>Lift the suspension today</button>}
                      </div>
                    )}
                    <ContactLines phone={h.phone} email={h.email} address={h.address} className="mt-1.5" />
                    <ContactIcons phone={h.phone} email={h.email} className="mt-1.5" />
                    {canPhoto && <PhotoUpload memberId={h.memberId} hasPhoto={!!h.photoUrl} compact className="-ml-2" onChange={() => refresh()} />}
                  </div>
                  {manage && !h.via && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-8 shrink-0">Change <ChevronDown className="size-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => setMoving(h)}><TrendingUp className="size-4" /> Promote or move…</DropdownMenuItem>
                        {!h.suspension && <DropdownMenuItem onClick={() => setSuspending(h)}><PauseCircle className="size-4" /> Suspend…</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setEnding(h)}><LogOut className="size-4" /> End term: resigned, died…</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {office.filledBy !== "ex_officio" && history && history.filter((h) => !current.has(h.positionId)).length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Before and after</p>
            <ul className="space-y-1 text-sm">
              {history.filter((h) => !current.has(h.positionId)).map((h) => {
                const future = h.startDate && h.startDate > today()
                const r = h.endReason ? END_REASON[h.endReason] : null
                return (
                  <li key={h.positionId} className="flex items-start gap-2">
                    <PassportPhoto url={h.photoUrl} name={h.name} className="w-7" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2">
                        <span className="font-medium">{h.name}</span>
                        <span className="text-muted-foreground">{h.startDate ? monthYear(h.startDate) : "?"} – {h.endDate ? monthYear(h.endDate) : "open"}</span>
                        {future ? <span className="rounded bg-primary/10 px-1.5 text-[11px] text-primary">Next</span>
                          : r && <span className={cn("rounded px-1.5 text-[11px]", r.tone)}>{r.label}{h.movedTo ? ` → ${h.movedTo.title}` : ""}</span>}
                        {h.acting && <span className="rounded bg-info/10 px-1.5 text-[11px] text-info">Acting</span>}
                        {h.suspensions.length > 0 && <span className="rounded bg-destructive/10 px-1.5 text-[11px] text-destructive" title={h.suspensions.map((x) => `${date(x.since)}: ${x.reason}`).join("\n")}>Suspended {h.suspensions.length}×</span>}
                      </p>
                      {h.endNote && <p className="text-xs italic text-muted-foreground">{h.endNote}</p>}
                    </div>
                    {manage && <Button size="icon" variant="ghost" className="size-7" onClick={() => setRemoving(h)} aria-label="Remove"><Trash2 className="size-3.5" /></Button>}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {manage && <Button variant="ghost" onClick={onEdit}><Pencil className="size-4" /> Edit seat</Button>}
          {manage && office.filledBy !== "ex_officio" && <Button onClick={() => setAdding(true)}><UserPlus className="size-4" /> {office.vacant > 0 ? "Fill the seat" : "Next holder"}</Button>}
        </DialogFooter>
        {adding && <AssignForm office={office} onClose={() => setAdding(false)} onDone={done} />}
        {ending && <EndTermForm holder={ending} seat={office.title} onClose={() => setEnding(null)} onDone={done} />}
        {suspending && <SuspendForm holder={suspending} seat={office.title} onClose={() => setSuspending(null)} onDone={done} />}
        {moving && <MoveForm holder={moving} from={office} all={all} onClose={() => setMoving(null)} onDone={done} />}
        {removing && <ConfirmDialog open onOpenChange={(o) => !o && setRemoving(null)} title={`Remove ${removing.name}'s term?`} description="Only do this for a mistake. To record that someone stepped down, end their term instead."
          confirmLabel="Remove" onConfirm={async () => { const ok = await runAction(() => del(`/council/terms/${removing.positionId}`), "Term removed"); if (ok) done(); return ok }} />}
      </DialogContent>
    </Dialog>
  )
}

function AssignForm({ office, onClose, onDone }: { office: CouncilOffice; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ startDate: today(), endDate: "", acting: false })
  const [pending, setPending] = useState(false)
  const [memberId, setMemberId] = useState<string | null>(null)
  const autoEnd = office.termYears && v.startDate ? (() => { const d = new Date(`${v.startDate}T00:00`); d.setFullYear(d.getFullYear() + office.termYears!); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) })() : null
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{office.title}: who holds it</DialogTitle><DialogDescription>{office.termYears ? `A ${office.termYears}-year term unless you set an end date.` : "Leave the end date empty if there isn't one."}</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="as-m">Member</Label><MemberPicker id="as-m" name="memberId" onSelect={(m) => setMemberId(m?.id ?? null)} /></div>
          <div className="space-y-2"><Label htmlFor="as-s">From</Label><Input id="as-s" type="date" value={v.startDate} onChange={(e) => setV({ ...v, startDate: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="as-e">Until</Label><Input id="as-e" type="date" min={v.startDate} value={v.endDate} onChange={(e) => setV({ ...v, endDate: e.target.value })} placeholder={autoEnd ?? ""} />
            {!v.endDate && autoEnd && <p className="text-xs text-muted-foreground">Ends {date(autoEnd)}</p>}</div>
          <div className="flex items-center justify-between rounded-xl border px-3 py-2 sm:col-span-2"><Label htmlFor="as-a">Acting (standing in)</Label><Switch id="as-a" checked={v.acting} onCheckedChange={(c) => setV({ ...v, acting: c })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pending || !memberId} onClick={async () => {
            setPending(true)
            const ok = await runAction(() => post(`/council/offices/${office.id}/holders`, { memberId: Number(memberId), startDate: v.startDate, endDate: v.endDate || null, acting: v.acting }), "Seat filled")
            setPending(false)
            if (ok) (onDone(), onClose())
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EndTermForm({ holder, seat, onClose, onDone }: { holder: CouncilHolder; seat: string; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ endDate: today(), reason: holder.endDate && holder.endDate <= today() ? "completed" : "resigned", note: "" })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{holder.name} leaves the {seat} seat</DialogTitle><DialogDescription>They stay in the seat&apos;s history with the reason; the seat is free from the next day.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="et-r">Why</Label>
            <Select value={v.reason} onValueChange={(x) => x && setV({ ...v, reason: x })}><SelectTrigger id="et-r" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{(["completed", "resigned", "died", "removed", "other"] as const).map((k) => <SelectItem key={k} value={k}>{END_REASON[k].label.replace(" ✝", "")}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="et-d">Last day</Label><Input id="et-d" type="date" value={v.endDate} min={holder.startDate ?? undefined} onChange={(e) => setV({ ...v, endDate: e.target.value })} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="et-n">{v.reason === "removed" ? "Council resolution / reason" : "Note"}</Label>
            <Input id="et-n" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder={v.reason === "resigned" ? "e.g. Moving to Gulu for work (letter received 3 Nov)" : v.reason === "removed" ? "e.g. PCC minute 12/2026" : "Optional"} /></div>
        </div>
        {v.reason === "died" && <p className="rounded-lg bg-muted px-3 py-2 text-xs">To update the registers too (burial announcement, care case, welfare), use <b>Record death</b> on the member&apos;s profile: it ends every seat they hold.</p>}
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={v.reason === "removed" && !v.note.trim()} onClick={async () => { if (await runAction(() => post(`/council/terms/${holder.positionId}/end`, { endDate: v.endDate, reason: v.reason, note: v.note || null }), "Recorded")) (onDone(), onClose()) }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SuspendForm({ holder, seat, onClose, onDone }: { holder: CouncilHolder; seat: string; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ startDate: today(), endDate: "", reason: "" })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Suspend {holder.name} as {seat}</DialogTitle><DialogDescription>They keep the seat but do not act in it. You can name someone to act meanwhile with <b>Fill the seat → Acting</b>.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="su-s">From</Label><Input id="su-s" type="date" value={v.startDate} onChange={(e) => setV({ ...v, startDate: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="su-e">Until</Label><Input id="su-e" type="date" min={v.startDate} value={v.endDate} onChange={(e) => setV({ ...v, endDate: e.target.value })} />
            {!v.endDate && <p className="text-xs text-muted-foreground">Until lifted</p>}</div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="su-r">Reason</Label><Input id="su-r" value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} placeholder="e.g. Pending the audit of the 2025 accounts (PCC minute 8/2026)" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={!v.reason.trim()} onClick={async () => { if (await runAction(() => post(`/council/terms/${holder.positionId}/suspend`, { startDate: v.startDate, endDate: v.endDate || null, reason: v.reason }), "Suspended")) (onDone(), onClose()) }}>Suspend</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MoveForm({ holder, from, all, onClose, onDone }: { holder: CouncilHolder; from: CouncilOffice; all: Array<CouncilOffice & { bodyName: string }>; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ officeId: "", date: today(), reason: "promoted", note: "" })
  const targets = all.filter((o) => o.id !== from.id && o.filledBy !== "ex_officio")
  const target = targets.find((o) => o.id === v.officeId)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Promote or move {holder.name}</DialogTitle><DialogDescription>Their term as {from.title} ends the day before; a new term starts in the other seat. Both stay linked in the history.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="mv-o">To the seat of</Label>
            <Select value={v.officeId} onValueChange={(x) => x && setV({ ...v, officeId: x })}><SelectTrigger id="mv-o" className="w-full"><SelectValue placeholder="Choose a seat" /></SelectTrigger>
              <SelectContent>{targets.map((o) => <SelectItem key={o.id} value={o.id}>{o.title} · {o.bodyName}{o.vacant ? " (vacant)" : ""}</SelectItem>)}</SelectContent></Select>
            {target && target.vacant === 0 && <p className="text-xs text-warning">That seat is full: end the current holder&apos;s term first, or this will be refused.</p>}</div>
          <div className="space-y-2"><Label htmlFor="mv-r">This is</Label>
            <Select value={v.reason} onValueChange={(x) => x && setV({ ...v, reason: x })}><SelectTrigger id="mv-r" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="promoted">A promotion</SelectItem><SelectItem value="moved">A move (same level)</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="mv-d">From</Label><Input id="mv-d" type="date" value={v.date} min={holder.startDate ?? undefined} onChange={(e) => setV({ ...v, date: e.target.value })} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="mv-n">Note</Label><Input id="mv-n" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="e.g. Elected at the AGM, 18 Jan" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!v.officeId} onClick={async () => { if (await runAction(() => post(`/council/terms/${holder.positionId}/move`, { officeId: Number(v.officeId), date: v.date, reason: v.reason, note: v.note || null }), v.reason === "promoted" ? "Promoted" : "Moved")) (onDone(), onClose()) }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Recent changes: who joined, left (and why), was suspended, reinstated or promoted. */
function ActivityFeed() {
  const { data } = useApi<CouncilEvent[]>("/council/activity?limit=12")
  const icon: Record<CouncilEvent["kind"], { I: typeof Hourglass; c: string }> = {
    joined: { I: UserPlus, c: "text-primary" }, acting: { I: UserPlus, c: "text-info" }, completed: { I: LogOut, c: "text-muted-foreground" },
    resigned: { I: LogOut, c: "text-warning" }, died: { I: Cross, c: "text-foreground" }, removed: { I: UserX, c: "text-destructive" },
    promoted: { I: TrendingUp, c: "text-success" }, moved: { I: ArrowRightLeft, c: "text-info" }, other: { I: LogOut, c: "text-muted-foreground" },
    suspended: { I: PauseCircle, c: "text-destructive" }, reinstated: { I: PlayCircle, c: "text-success" },
  }
  if (!data?.length) return null
  return (
    <Card className="mt-6 gap-0 py-2">
      <p className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recent changes</p>
      <ul className="space-y-2.5 px-4 pb-2">
        {data.map((e, i) => {
          const { I, c } = icon[e.kind] ?? icon.other
          return (
            <li key={i} className="flex gap-2.5 text-sm">
              <I className={cn("mt-0.5 size-4 shrink-0", c)} />
              <div className="min-w-0">
                <p className="leading-snug">{e.text}</p>
                <p className="text-xs text-muted-foreground">{date(e.date)}{e.note ? ` · ${e.note}` : ""}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function BodyForm({ body, parentId, bodies, onClose, onSaved, onDeleted }: { body: CouncilBody | null; parentId: string | null; bodies: CouncilBody[]; onClose: () => void; onSaved: (id: string) => void; onDeleted: () => void }) {
  const { can } = useAuth()
  const { data: ministries = [] } = useApi<Ministry[]>(can("members.view") ? "/ministries" : null)
  const [v, setV] = useState({ name: body?.name ?? "", kind: body?.kind ?? "committee", parentId: body ? body.parentId ?? "" : parentId ?? "", ministryId: body?.ministry?.id ?? "", description: body?.description ?? "" })
  const [removing, setRemoving] = useState(false)
  const save = async () => {
    const payload = { name: v.name, kind: v.kind, parentId: v.parentId ? Number(v.parentId) : null, ministryId: v.ministryId ? Number(v.ministryId) : null, description: v.description || null }
    let id = body?.id ?? ""
    const ok = await runAction(async () => {
      if (body) await patch(`/council/bodies/${body.id}`, payload)
      else id = (await post<{ data: { id: string } }>("/council/bodies", payload)).data.id
    }, body ? "Saved" : "Added")
    if (ok) (refresh(), onSaved(id))
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{body ? `Edit ${body.name}` : "Add a committee or organisation"}</DialogTitle><DialogDescription>Where it sits in the structure. Add its seats afterwards.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="bd-n">Name</Label><Input id="bd-n" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="e.g. Audit committee" /></div>
          <div className="space-y-2"><Label htmlFor="bd-k">Kind</Label>
            <Select value={v.kind} onValueChange={(x) => x && setV({ ...v, kind: x as CouncilBody["kind"] })}><SelectTrigger id="bd-k" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(KIND).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="bd-p">Sits under</Label>
            <Select value={v.parentId || "none"} onValueChange={(x) => x && setV({ ...v, parentId: x === "none" ? "" : x })}><SelectTrigger id="bd-p" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Nothing (top)</SelectItem>{bodies.filter((b) => b.id !== body?.id).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
          {v.kind === "organisation" && ministries.length > 0 && (
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="bd-m">Is this ministry</Label>
              <Select value={v.ministryId || "none"} onValueChange={(x) => x && setV({ ...v, ministryId: x === "none" ? "" : x })}><SelectTrigger id="bd-m" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Not linked</SelectItem>{ministries.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
          )}
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="bd-d">What it does</Label><Input id="bd-d" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} placeholder="Optional" /></div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          {body && <Button variant="ghost" className="mr-auto text-destructive" onClick={() => setRemoving(true)}><Trash2 className="size-4" /> Remove</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!v.name.trim()} onClick={save}>Save</Button>
        </DialogFooter>
        {removing && body && <ConfirmDialog open onOpenChange={(o) => !o && setRemoving(false)} title={`Remove ${body.name}?`} description="Its seats are removed; the people keep their position history." confirmLabel="Remove"
          onConfirm={async () => { const ok = await runAction(() => del(`/council/bodies/${body.id}`), "Removed"); if (ok) (refresh(), onDeleted()); return ok }} />}
      </DialogContent>
    </Dialog>
  )
}

function OfficeForm({ office, body, all, onClose }: { office: CouncilOffice | null; body: CouncilBody; all: Array<CouncilOffice & { bodyName: string }>; onClose: () => void }) {
  const [v, setV] = useState({
    title: office?.title ?? "", reportsTo: office?.reportsTo ?? "", filledBy: office?.filledBy ?? "elected", exOfficioOf: office?.exOfficioOf?.id ?? "",
    seats: String(office?.seats ?? 1), termYears: office?.termYears ? String(office.termYears) : "", maxTerms: office?.maxTerms ? String(office.maxTerms) : "", note: office?.note ?? "",
  })
  const [removing, setRemoving] = useState(false)
  const save = async () => {
    const payload = { title: v.title, reportsTo: v.reportsTo ? Number(v.reportsTo) : null, filledBy: v.filledBy, exOfficioOf: v.filledBy === "ex_officio" && v.exOfficioOf ? Number(v.exOfficioOf) : null,
      seats: Number(v.seats) || 1, termYears: v.termYears ? Number(v.termYears) : null, maxTerms: v.maxTerms ? Number(v.maxTerms) : null, note: v.note || null }
    const ok = await runAction(() => (office ? patch(`/council/offices/${office.id}`, payload) : post("/council/offices", { ...payload, bodyId: Number(body.id) })), office ? "Seat saved" : "Seat added")
    if (ok) (refresh(), onClose())
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>{office ? `Edit seat: ${office.title}` : `Add a seat to ${body.name}`}</DialogTitle><DialogDescription>Who it reports to draws the line on the chart.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="of-t">Title</Label><Input id="of-t" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="e.g. Vice chairperson" /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="of-r">Reports to</Label>
            <Select value={v.reportsTo || "none"} onValueChange={(x) => x && setV({ ...v, reportsTo: x === "none" ? "" : x })}><SelectTrigger id="of-r" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Nobody in this body (top)</SelectItem>{body.offices.filter((o) => o.id !== office?.id).map((o) => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="of-f">Filled by</Label>
            <Select value={v.filledBy} onValueChange={(x) => x && setV({ ...v, filledBy: x as CouncilOffice["filledBy"] })}><SelectTrigger id="of-f" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(FILLED).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          {v.filledBy === "ex_officio" ? (
            <div className="space-y-2"><Label htmlFor="of-x">Because they are</Label>
              <Select value={v.exOfficioOf || ""} onValueChange={(x) => x && setV({ ...v, exOfficioOf: x })}><SelectTrigger id="of-x" className="w-full"><SelectValue placeholder="Choose a seat" /></SelectTrigger>
                <SelectContent>{all.filter((o) => o.id !== office?.id && o.filledBy !== "ex_officio").map((o) => <SelectItem key={o.id} value={o.id}>{o.title} · {o.bodyName}</SelectItem>)}</SelectContent></Select></div>
          ) : (
            <div className="space-y-2"><Label htmlFor="of-s">Seats</Label><Input id="of-s" type="number" min="1" max="50" value={v.seats} onChange={(e) => setV({ ...v, seats: e.target.value })} /></div>
          )}
          {v.filledBy !== "ex_officio" && <>
            <div className="space-y-2"><Label htmlFor="of-y">Term (years)</Label><Input id="of-y" type="number" min="1" max="10" value={v.termYears} onChange={(e) => setV({ ...v, termYears: e.target.value })} placeholder="No fixed term" /></div>
            <div className="space-y-2"><Label htmlFor="of-m">Terms in a row, at most</Label><Input id="of-m" type="number" min="1" max="10" value={v.maxTerms} onChange={(e) => setV({ ...v, maxTerms: e.target.value })} placeholder="No limit" /></div>
          </>}
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="of-n">Note</Label><Input id="of-n" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="e.g. Elected at the AGM" /></div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          {office && <Button variant="ghost" className="mr-auto text-destructive" onClick={() => setRemoving(true)}><Trash2 className="size-4" /> Remove seat</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!v.title.trim() || (v.filledBy === "ex_officio" && !v.exOfficioOf)} onClick={save}>Save</Button>
        </DialogFooter>
        {removing && office && <ConfirmDialog open onOpenChange={(o) => !o && setRemoving(false)} title={`Remove the ${office.title} seat?`} description="The people who held it keep their position history." confirmLabel="Remove"
          onConfirm={async () => { const ok = await runAction(() => del(`/council/offices/${office.id}`), "Seat removed"); if (ok) (refresh(), onClose()); return ok }} />}
      </DialogContent>
    </Dialog>
  )
}

