"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Users, UserPlus, Plus, AlertTriangle, ClipboardCheck, MessageSquareText,
  UserRoundPlus, CalendarDays, Wallet, History, ChevronDown, ClipboardList,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AttentionQueue } from "@/components/attention-queue"
import { DataStatus, EngagementCard, GivingYearChart, HealthCards, Verdict, short } from "@/components/dashboard-health"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RecentActivities } from "@/components/recent-activities"
import { EmptyState, Page } from "@/components/page"
import type { AttentionItem, CalendarRange, DashboardHealth, DashboardStats, HealthCard, SundaySnapshot } from "@/lib/types"
import { qs, useApi } from "@/lib/api"
import { KIND_META, LITURGICAL } from "@/lib/calendar"
import { useAuth } from "@/lib/auth"
import { money } from "@/lib/format"
import { cn } from "@/lib/utils"

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

const todayLabel = () => new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })

type View = "pastor" | "treasurer" | "office"

/**
 * One screen per role: a handful of numbers and one list, chosen for the decisions that role makes.
 * Someone with several roles (an admin, a vicar who also keeps the books) can switch views.
 */
const VIEWS: Record<View, {
  label: string; hint: string
  cards: HealthCard["key"][]
  focus: { label: string; match: (i: AttentionItem) => boolean }
  chart: "giving" | null
  week: boolean
}> = {
  pastor: {
    label: "Pastor", hint: "People, pastoral care and the overall picture",
    cards: ["attendance", "giving", "members", "cash"],
    focus: { label: "Everything", match: () => true },
    chart: "giving", week: true,
  },
  treasurer: {
    label: "Treasurer", hint: "Money in, money out, and what has to be paid",
    cards: ["giving", "cash", "due", "unbanked"],
    focus: { label: "Money items", match: (i) => i.area === "money" || i.key === "welfare" },
    chart: "giving", week: false,
  },
  office: {
    label: "Office", hint: "Registers, Sunday records and the week ahead",
    cards: ["attendance", "members"],
    focus: { label: "Registers and care", match: (i) => i.area !== "money" },
    chart: null, week: true,
  },
}

/** The views this user can use, and the one that fits their role best. */
function useViews(): { views: View[]; fallback: View } {
  const { can } = useAuth()
  const people = can("members.view"), money = can("finance.view")
  const views = ([people && money && "pastor", money && "treasurer", people && "office"].filter(Boolean)) as View[]
  const fallback: View = can("finance.manage") && !can("members.manage") ? "treasurer"
    : can("members.manage") && !money ? "office"
    : people && money ? "pastor" : money ? "treasurer" : "office"
  return { views, fallback }
}

/**
 * The church office's start page: a verdict, the queue of what needs doing, then the few figures
 * the chosen view works with. Every block is shown only to roles that may open the page behind it.
 */
export function DashboardContent() {
  const { user, can } = useAuth()
  const router = useRouter()
  const people = can("members.view")
  const finance = can("finance.view")
  const broad = people || finance
  useEffect(() => {
    if (!broad) router.replace(can("groups.lead") ? "/my-groups" : "/announcements")
  }, [broad, can, router])
  const { data: stats, error } = useApi<DashboardStats>(broad ? "/dashboard" : null)
  const { data: health } = useApi<DashboardHealth>(broad ? "/dashboard/health" : null, { refreshInterval: 5 * 60_000 })
  const firstName = user?.name.split(" ")[0]
  const [changes, setChanges] = useState(false)
  const { views, fallback } = useViews()
  const [picked, setPicked] = useState<View | null>(null)
  useEffect(() => { try { const v = localStorage.getItem("synago.dashView") as View | null; if (v) setPicked(v) } catch {} }, [])
  const view: View = picked && views.includes(picked) ? picked : fallback
  const choose = (v: View) => { setPicked(v); try { localStorage.setItem("synago.dashView", v) } catch {} }
  const cfg = VIEWS[view]
  const cards = health?.cards ? cfg.cards.map((k) => health.cards.find((c) => c.key === k)).filter((c): c is HealthCard => !!c) : undefined

  const greet = `${greeting()}${firstName ? `, ${firstName}` : ""}`
  const switcher = views.length > 1 && (
    <div role="radiogroup" aria-label="Dashboard view" className="inline-flex shrink-0 rounded-lg border bg-card p-0.5 text-xs shadow-soft">
      {views.map((v) => (
        <button key={v} type="button" role="radio" aria-checked={v === view} title={VIEWS[v].hint} onClick={() => choose(v)}
          className={cn("rounded-md px-2.5 py-1 font-medium transition", v === view ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
          {VIEWS[v].label}
        </button>
      ))}
    </div>
  )
  const rail = (
    <>
      <ThisSunday />
      {cfg.week && <ComingUp />}
      {view === "pastor" && health?.engagement && <EngagementCard data={health.engagement} />}
    </>
  )
  const chart = cfg.chart && health?.givingYear ? <GivingYearChart data={health.givingYear} /> : null

  return (
    <Page className="space-y-6">
      <DashboardHeader greet={greet} switcher={switcher} actions={<QuickActions view={view} />} />
      {broad && <VerdictBanner verdict={health?.verdict} status={health?.dataStatus} onChanges={() => setChanges(true)} />}
      <StickyVerdict verdict={health?.verdict} switcher={switcher} />

      {error ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load the overview" description={error.message} />
      ) : (
        // one 12-column grid: the left 8 are where you decide, the right 4 are context
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
            {/* on a phone the queue comes first, then the numbers */}
            <div className="order-2 lg:order-1"><HealthCards cards={cards} /></div>
            <div className="order-1 lg:order-2"><AttentionQueue key={view} focus={cfg.focus.label === "Everything" ? undefined : cfg.focus} /></div>
            {chart && <div className="order-3">{chart}</div>}
          </div>
          <aside className="flex min-w-0 flex-col gap-6 lg:col-span-4">{rail}</aside>
        </div>
      )}

      <Dialog open={changes} onOpenChange={setChanges}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>What changed</DialogTitle>
            <DialogDescription>The latest members, gifts and contributions recorded</DialogDescription>
          </DialogHeader>
          {stats ? <RecentActivities activities={stats.recentActivities} /> : <div className="h-40 animate-pulse rounded-xl bg-muted" />}
        </DialogContent>
      </Dialog>
    </Page>
  )
}

/** Date, the church season (its liturgical colour), the greeting; the view switch and the main action. */
function DashboardHeader({ greet, switcher, actions }: { greet: string; switcher: React.ReactNode; actions: React.ReactNode }) {
  const t = new Date()
  const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
  const { data: cal } = useApi<CalendarRange>(qs("/calendar", { from: iso, to: iso, kinds: "event" }), { revalidateOnFocus: false })
  const season = cal?.feasts[0] ?? cal?.season ?? cal?.seasons[0] ?? null
  const colour = season ? LITURGICAL[season.colour].bg : null
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {todayLabel()}
          {season && (
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-[11px] normal-case tracking-normal text-foreground">
              <span className="size-2 rounded-full ring-1 ring-black/10" style={{ background: colour! }} />
              {season.kind === "feast" ? season.name : `Season of ${season.name}`}
            </span>
          )}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{greet}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">{switcher}{actions}</div>
      {colour && <div aria-hidden className="h-1 w-full rounded-full opacity-80" style={{ background: `linear-gradient(90deg, ${colour}, transparent 70%)` }} />}
    </header>
  )
}

const VERDICT_TONE = {
  good: { dot: "bg-success", card: "border-success/25 bg-success/[0.05]" },
  watch: { dot: "bg-warning", card: "border-warning/35 bg-warning/[0.06]" },
  bad: { dot: "bg-destructive", card: "border-destructive/30 bg-destructive/[0.05]" },
  neutral: { dot: "bg-muted-foreground", card: "bg-card" },
} as const

/** The one sentence to read first, full width, tinted by how things are. */
function VerdictBanner({ verdict, status, onChanges }: { verdict: DashboardHealth["verdict"] | undefined; status: DashboardHealth["dataStatus"] | undefined; onChanges: () => void }) {
  const tone = VERDICT_TONE[verdict?.tone ?? "neutral"]
  return (
    <section aria-label="How things are" className={cn("flex flex-col gap-3 rounded-2xl border px-5 py-4 shadow-soft sm:flex-row sm:items-center", tone.card)}>
      <span className={cn("hidden size-2.5 shrink-0 rounded-full sm:block", tone.dot)} aria-hidden />
      <p className="min-w-0 flex-1 text-base leading-relaxed text-muted-foreground md:text-lg"><Verdict verdict={verdict} /></p>
      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        <DataStatus status={status} />
        <button type="button" onClick={onChanges} className="inline-flex items-center gap-1 hover:text-foreground"><History className="size-3.5" /> What changed</button>
      </div>
    </section>
  )
}

/** Once the header scrolls away, a slim bar keeps the verdict and the view switch in sight. */
function StickyVerdict({ verdict, switcher }: { verdict: DashboardHealth["verdict"] | undefined; switcher: React.ReactNode }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const main = document.querySelector("main")
    if (!main) return
    const on = () => setShown(main.scrollTop > 260)
    main.addEventListener("scroll", on, { passive: true })
    return () => main.removeEventListener("scroll", on)
  }, [])
  if (!verdict) return null
  return (
    <div aria-hidden={!shown} className={cn("pointer-events-none sticky top-2 z-10 -mt-6 hidden h-0 md:top-[76px] md:block", shown && "pointer-events-auto")}>
      <div className={cn("mx-auto flex max-w-3xl items-center gap-3 rounded-full border bg-card/95 px-4 py-2 shadow-lg backdrop-blur transition duration-200",
        shown ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0")}>
        <span className={cn("size-2.5 shrink-0 rounded-full", VERDICT_TONE[verdict.tone].dot)} />
        <p className="min-w-0 flex-1 truncate text-sm"><b>{verdict.opening}:</b> <span className="text-muted-foreground">{verdict.parts.map((p) => p.text).join(", ")}</span></p>
        {switcher}
      </div>
    </div>
  )
}

/** One main action for the view, the rest in a "Record" menu, limited to what the role may do. */
function QuickActions({ view }: { view: View }) {
  const { can } = useAuth()
  const actions = [
    { href: "/offertory", label: "Record offering", icon: Plus, perm: "finance.manage", primary: view !== "office" },
    { href: "/attendance", label: "Attendance", icon: ClipboardCheck, perm: "members.manage", primary: view === "office" },
    { href: "/visitors", label: "Log a visitor", icon: UserRoundPlus, perm: "members.manage" },
    { href: "/members", label: "Add a member", icon: UserPlus, perm: "members.manage" },
    { href: "/requisitions", label: "Ask for a purchase", icon: ClipboardList, perm: "requisitions.request" },
    { href: "/sms", label: "Send an SMS", icon: MessageSquareText, perm: "sms.send" },
  ].filter((a) => can(a.perm))
  const primary = actions.find((a) => a.primary) ?? actions[0]
  const rest = actions.filter((a) => a !== primary)
  if (!primary) return null
  return (
    <div className="inline-flex">
      <Button asChild className={cn(rest.length && "rounded-r-none")}><Link href={primary.href}><primary.icon className="size-4" /> {primary.label}</Link></Button>
      {rest.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="rounded-l-none border-l border-primary-foreground/20 px-2.5" aria-label="More things to record"><ChevronDown className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {rest.map((a) => <DropdownMenuItem key={a.href} asChild><Link href={a.href}><a.icon className="size-4" /> {a.label}</Link></DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

/** Change vs a comparison value: "+12" / "−8%" style chip. */
function Delta({ now, before, label, pct }: { now: number; before: number | null; label: string; pct?: boolean }) {
  if (before === null || before === 0) return <span className="text-xs text-muted-foreground">no {label} figure</span>
  const diff = now - before
  const shown = pct ? `${Math.round((diff / before) * 100)}%` : Math.round(diff).toLocaleString()
  return (
    <span className={cn("text-xs", diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground")}>
      {diff > 0 ? "▲ +" : diff < 0 ? "▼ " : ""}{diff === 0 ? "same as" : shown} {diff === 0 ? label : `vs ${label}`}
    </span>
  )
}

/** The latest Sunday per service: attendance and giving, with last week and the same Sunday last year. */
function ThisSunday() {
  const { data } = useApi<SundaySnapshot>("/dashboard/sunday")
  if (!data) return <Card className="min-h-64 animate-pulse bg-muted" />
  const day = new Date(`${data.date}T00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
  const t = data.totals
  const recorded = data.services.some((s) => (s.attendance ?? 0) > 0 || (s.giving ?? 0) > 0)
  return (
    <Card className="gap-0 p-5">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className={SECTION}>Last Sunday</h2>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" />{day}</p>
      </div>
      {!recorded ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Nothing recorded for this Sunday yet.
          <div className="mt-3 flex justify-center gap-2">
            {data.showAttendance && <Button size="sm" variant="outline" asChild><Link href={`/attendance?date=${data.date}`}>Record attendance</Link></Button>}
            {data.showGiving && <Button size="sm" variant="outline" asChild><Link href="/offertory">Record offertory</Link></Button>}
          </div>
        </div>
      ) : (
        <>
          <div className={cn("grid gap-3", data.showAttendance && data.showGiving ? "grid-cols-2" : "grid-cols-1")}>
            {data.showAttendance && t.attendance !== null && (
              <div className="rounded-xl border p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="size-3.5" /> In church that day</p>
                <p className="text-2xl font-semibold tabular">{t.attendance.toLocaleString()}</p>
                <Delta now={t.attendance} before={t.attendancePrev} label="last week" />
                {!!t.visitors && <p className="text-xs text-muted-foreground">incl. {t.visitors} visitor{t.visitors === 1 ? "" : "s"}</p>}
              </div>
            )}
            {data.showGiving && t.giving !== null && (
              <div className="rounded-xl border p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet className="size-3.5" /> Offertory</p>
                <p className="truncate text-2xl font-semibold tabular" title={money(t.giving)}>{short(t.giving, "money")}</p>
                <Delta now={t.giving} before={t.givingPrev} label="last week" pct />
                <div><Delta now={t.giving} before={t.givingLastYear} label="last year" pct /></div>
              </div>
            )}
          </div>
          <table className="mt-4 w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground">
              <th className="pb-1 text-left font-medium">Service</th>
              {data.showAttendance && <th className="pb-1 text-right font-medium">People</th>}
              {data.showGiving && <th className="pb-1 text-right font-medium">Giving</th>}
            </tr></thead>
            <tbody className="divide-y">
              {data.services.map((s) => (
                <tr key={s.service}>
                  <td className="py-1.5">{s.service}</td>
                  {data.showAttendance && <td className="py-1.5 text-right tabular">{s.attendance ?? <MissingLink href={`/attendance?date=${data.date}`} />}</td>}
                  {data.showGiving && <td className="py-1.5 text-right tabular">{s.giving ? money(s.giving) : <MissingLink href="/offertory" />}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  )
}

/** Section titles: one small-caps style everywhere on the dashboard. */
export const SECTION = "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"

/** A gap in last Sunday's records, fixed in one click (this is the only place it is shown). */
function MissingLink({ href }: { href: string }) {
  return <Link href={href} className="inline-flex items-center gap-1 rounded-md bg-warning/12 px-1.5 py-0.5 text-xs font-medium text-[color-mix(in_oklch,var(--warning)_70%,black)] hover:underline dark:text-warning">Record</Link>
}

/** The next seven days from the calendar: events, burials, weddings, baptisms (no routine services/meetings). */
function ComingUp() {
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + 7)
  const d = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`
  const { data } = useApi<CalendarRange>(qs("/calendar", { from: d(start), to: d(end), kinds: "event,announcement,sacrament,birthday" }))
  const items = data?.items ?? []
  const birthdays = items.filter((i) => i.kind === "birthday")
  const rest = items.filter((i) => i.kind !== "birthday").slice(0, 6)
  return (
    <Card className="gap-0 p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className={SECTION}>This week</h2>
        <Link href="/calendar" className="text-xs text-primary hover:underline">Calendar →</Link>
      </div>
      {!data ? <div className="h-24 animate-pulse rounded-xl bg-muted" /> : (
        <ul className="space-y-2">
          {rest.map((i) => (
            <li key={i.id} className="flex items-center gap-3 text-sm">
              <span className={`h-8 w-1 shrink-0 rounded-full ${KIND_META[i.kind].dot}`} />
              <span className="w-14 shrink-0 text-xs font-semibold text-muted-foreground">
                {new Date(i.allDay ? `${i.start}T00:00` : i.start).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{i.title}</span>
            </li>
          ))}
          {birthdays.length > 0 && (
            <li className="flex items-center gap-3 rounded-xl bg-gold/10 px-3 py-2 text-sm">
              <span>🎂</span>
              <span className="min-w-0 flex-1 truncate">{birthdays.slice(0, 4).map((b) => b.title.split(" ")[0]).join(", ")}{birthdays.length > 4 ? ` +${birthdays.length - 4}` : ""}</span>
              <span className="text-xs text-muted-foreground">{birthdays.length} birthday{birthdays.length === 1 ? "" : "s"}</span>
            </li>
          )}
          {!rest.length && !birthdays.length && <li className="text-sm text-muted-foreground">Nothing special this week.</li>}
        </ul>
      )}
    </Card>
  )
}
