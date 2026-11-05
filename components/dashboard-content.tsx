"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Users, UserPlus, Plus, AlertTriangle, ClipboardCheck, MessageSquareText,
  UserRoundPlus, CalendarDays, Wallet, ChevronDown, ClipboardList, Presentation,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AttentionQueue } from "@/components/attention-queue"
import { EngagementCard, HealthCards, short } from "@/components/dashboard-health"
import { POSITION_DOT, PositionBanner, positionLine } from "@/components/dashboard-position"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RecentActivities } from "@/components/recent-activities"
import { EmptyState, Page } from "@/components/page"
import type { AttentionItem, CalendarRange, DashboardGlance, DashboardHealth, DashboardStats, HealthCard, SundaySnapshot } from "@/lib/types"
import { AttendanceByService, BankBalances, GlanceStrip, IncomeDonut, MoneyFlowChart, ProjectBreakdown } from "@/components/dashboard-glance"
import { qs, useApi } from "@/lib/api"
import { KIND_META, LITURGICAL } from "@/lib/calendar"
import { useAuth } from "@/lib/auth"
import { money } from "@/lib/format"
import { cn } from "@/lib/utils"

const todayLabel = () => new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })

type View = "pastor" | "treasurer" | "office"

/**
 * One screen per role: a handful of numbers and one list, chosen for the decisions that role makes.
 * Someone with several roles (an admin, a vicar who also keeps the books) can switch views.
 */
const VIEWS: Record<View, {
  label: string; hint: string
  /** at-a-glance tiles, in this view's order (others follow) */
  tiles: string[]
  /** compact money cards above the charts */
  cards: HealthCard["key"][]
  focus: { label: string; match: (i: AttentionItem) => boolean }
  attendance: boolean
  week: boolean
}> = {
  pastor: {
    label: "Pastor", hint: "People, pastoral care and the overall picture",
    tiles: ["members", "attendance", "giving", "expenses", "bank", "projects"],
    cards: [], focus: { label: "Everything", match: () => true }, attendance: true, week: true,
  },
  treasurer: {
    label: "Treasurer", hint: "Money in, money out, and what has to be paid",
    tiles: ["giving", "expenses", "bank", "projects", "members", "attendance"],
    cards: ["unbanked"],
    focus: { label: "Money items", match: (i) => i.area === "money" || i.key === "welfare" }, attendance: false, week: false,
  },
  office: {
    label: "Office", hint: "Registers, Sunday records and the week ahead",
    tiles: ["attendance", "members"],
    cards: [], focus: { label: "Registers and care", match: (i) => i.area !== "money" }, attendance: true, week: true,
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
  const { can } = useAuth()
  const router = useRouter()
  const people = can("members.view")
  const finance = can("finance.view")
  const broad = people || finance
  useEffect(() => {
    if (!broad) router.replace(can("groups.lead") ? "/my-groups" : "/announcements")
  }, [broad, can, router])
  const { data: stats, error } = useApi<DashboardStats>(broad ? "/dashboard" : null)
  const { data: health } = useApi<DashboardHealth>(broad ? "/dashboard/health" : null, { refreshInterval: 5 * 60_000 })
  const { data: glance } = useApi<DashboardGlance>(broad ? "/dashboard/glance" : null, { refreshInterval: 5 * 60_000 })
  const [changes, setChanges] = useState(false)
  const { views, fallback } = useViews()
  const [picked, setPicked] = useState<View | null>(null)
  useEffect(() => { try { const v = localStorage.getItem("synago.dashView") as View | null; if (v) setPicked(v) } catch {} }, [])
  const view: View = picked && views.includes(picked) ? picked : fallback
  const choose = (v: View) => { setPicked(v); try { localStorage.setItem("synago.dashView", v) } catch {} }
  const cfg = VIEWS[view]
  const cards = health?.cards && cfg.cards.length ? cfg.cards.map((k) => health.cards.find((c) => c.key === k)).filter((c): c is HealthCard => !!c) : undefined

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
  const order = (k: string) => { const i = cfg.tiles.indexOf(k); return i < 0 ? 99 : i }
  const tiles = glance?.tiles.filter((t) => view !== "office" || cfg.tiles.includes(t.key)).sort((x, y) => order(x.key) - order(y.key))
  const money = finance && view !== "office"

  return (
    <Page className="space-y-6">
      <DashboardHeader switcher={switcher} actions={<QuickActions view={view} />} />
      {broad && <PositionBanner position={health?.position} status={health?.dataStatus} view={view} onChanges={() => setChanges(true)} />}
      <StickyPosition line={positionLine(health?.position, view)} switcher={switcher} />

      {error ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load the overview" description={error.message} />
      ) : (
        // one 12-column grid: the left 8 are where you decide, the right 4 are context
        <>
          <GlanceStrip tiles={tiles} />
          {cards && cards.length > 0 && <HealthCards cards={cards} compact />}

          {money && (glance?.moneyFlow || glance?.banks) && (
            <section className="grid gap-6 lg:grid-cols-12">
              {glance?.moneyFlow && <div className="min-w-0 lg:col-span-8"><MoneyFlowChart data={glance.moneyFlow} /></div>}
              {glance?.banks && <div className="min-w-0 lg:col-span-4"><BankBalances data={glance.banks} /></div>}
            </section>
          )}

          {money && (glance?.incomeMix || glance?.expenseMix || glance?.projectBreakdown) && (
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-12">
              {glance?.incomeMix && <div className="min-w-0 xl:col-span-4"><IncomeDonut data={glance.incomeMix} /></div>}
              {glance?.expenseMix && <div className="min-w-0 xl:col-span-4"><IncomeDonut data={glance.expenseMix} title="What's consuming the money" empty="No expenses recorded yet." /></div>}
              {glance?.projectBreakdown && <div className="min-w-0 md:col-span-2 xl:col-span-4"><ProjectBreakdown projects={glance.projectBreakdown} /></div>}
            </section>
          )}

          <section className="grid gap-6 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-8"><AttentionQueue key={view} limit={5} focus={cfg.focus.label === "Everything" ? undefined : cfg.focus} /></div>
            <aside className="min-w-0 lg:col-span-4"><ThisSunday /></aside>
          </section>

          {cfg.attendance && glance?.attendanceByService && <AttendanceByService data={glance.attendanceByService} />}

          {cfg.week && (
            <section className="grid gap-6 lg:grid-cols-12">
              <div className={cn("min-w-0", view === "pastor" && health?.engagement ? "lg:col-span-8" : "lg:col-span-12")}><ComingUp /></div>
              {view === "pastor" && health?.engagement && <div className="min-w-0 lg:col-span-4"><EngagementCard data={health.engagement} /></div>}
            </section>
          )}
        </>
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

/** Date and the church season (its liturgical colour); the view switch and the main action. The verdict below does the talking. */
function DashboardHeader({ switcher, actions }: { switcher: React.ReactNode; actions: React.ReactNode }) {
  const t = new Date()
  const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
  const { data: cal } = useApi<CalendarRange>(qs("/calendar", { from: iso, to: iso, kinds: "event" }), { revalidateOnFocus: false })
  const season = cal?.feasts[0] ?? cal?.season ?? cal?.seasons[0] ?? null
  const colour = season ? LITURGICAL[season.colour].bg : null
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="sr-only">Overview</h1>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {todayLabel()}
          {season && (
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-[11px] normal-case tracking-normal text-foreground">
              <span className="size-2 rounded-full ring-1 ring-black/10" style={{ background: colour! }} />
              {season.kind === "feast" ? season.name : `Season of ${season.name}`}
            </span>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {switcher}
        <Button variant="outline" asChild><Link href="/present" title="Full-screen slideshow for a projector or TV"><Presentation className="size-4" /> Present</Link></Button>
        {actions}
      </div>
      {colour && <div aria-hidden className="h-1 w-full rounded-full opacity-80" style={{ background: `linear-gradient(90deg, ${colour}, transparent 70%)` }} />}
    </header>
  )
}


/** The one sentence to read first, full width, tinted by how things are. */
/** Once the header scrolls away, a slim bar keeps the church position and the view switch in sight. */
function StickyPosition({ line, switcher }: { line: ReturnType<typeof positionLine>; switcher: React.ReactNode }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const main = document.querySelector("main")
    if (!main) return
    const on = () => setShown(main.scrollTop > 260)
    main.addEventListener("scroll", on, { passive: true })
    return () => main.removeEventListener("scroll", on)
  }, [])
  if (!line) return null
  return (
    <div aria-hidden={!shown} className={cn("pointer-events-none sticky top-2 z-10 -mt-6 hidden h-0 md:top-[76px] md:block", shown && "pointer-events-auto")}>
      <div className={cn("mx-auto flex max-w-3xl items-center gap-3 rounded-full border bg-card/95 px-4 py-2 shadow-lg backdrop-blur transition duration-200",
        shown ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0")}>
        <span className={cn("size-2.5 shrink-0 rounded-full", POSITION_DOT[line.tone])} />
        <p className="min-w-0 flex-1 truncate text-sm"><b className="tabular">{line.head}</b> <span className="text-muted-foreground">{line.text}</span></p>
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
function Delta({ now, before, label, pct, short: brief }: { now: number; before: number | null; label: string; pct?: boolean; short?: boolean }) {
  if (before === null || before === 0) return brief ? null : <span className="text-xs text-muted-foreground">no {label} figure</span>
  if (brief) {
    const d = now - before
    const v = pct ? `${Math.round((d / before) * 100)}%` : Math.round(d).toLocaleString()
    return <span className={cn("block text-[11px] tabular", d > 0 ? "text-success" : d < 0 ? "text-destructive" : "text-muted-foreground")}>{d > 0 ? "▲ " : d < 0 ? "▼ " : ""}{d === 0 ? "same" : v.replace("-", "")}</span>
  }
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
          <div className="grid grid-cols-3 gap-2 text-center">
            {data.showAttendance && t.attendance !== null && (
              <div className="rounded-xl bg-secondary/60 px-2 py-2">
                <p className="text-xl font-semibold tabular">{t.attendance.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">in church</p>
                <Delta now={t.attendance} before={t.attendancePrev} label="last week" short />
              </div>
            )}
            {data.showGiving && t.giving !== null && (
              <div className="rounded-xl bg-secondary/60 px-2 py-2">
                <p className="truncate text-xl font-semibold tabular" title={money(t.giving)}>{short(t.giving, "money").replace(/^\S+ /, "")}</p>
                <p className="text-[11px] text-muted-foreground">offertory</p>
                <Delta now={t.giving} before={t.givingPrev} label="last week" pct short />
              </div>
            )}
            {data.showAttendance && (
              <div className="rounded-xl bg-secondary/60 px-2 py-2">
                <p className="text-xl font-semibold tabular">{t.visitors ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">visitors</p>
              </div>
            )}
          </div>
          <ul className="mt-4 space-y-2.5">
            {data.services.map((sv) => {
              const top = Math.max(1, ...data.services.map((x) => x.attendance ?? 0))
              return (
                <li key={sv.service} className="text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate">{sv.service}</span>
                    <span className="flex shrink-0 items-center gap-3 tabular">
                      {data.showAttendance && (sv.attendance ?? <MissingLink href={`/attendance?date=${data.date}`} />)}
                      {data.showGiving && <span className="w-16 text-right text-xs text-muted-foreground">{sv.giving ? compactMoney(sv.giving) : <MissingLink href="/offertory" />}</span>}
                    </span>
                  </div>
                  {data.showAttendance && <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[var(--chart-1)] transition-[width] duration-700" style={{ width: `${((sv.attendance ?? 0) / top) * 100}%` }} /></div>}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Card>
  )
}

/** Section titles: one small-caps style everywhere on the dashboard. */
export const SECTION = "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"

/** A gap in last Sunday's records, fixed in one click (this is the only place it is shown). */
const compactMoney = (n: number) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n)

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
