"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Users, UserCheck, GraduationCap, HandCoins, UserPlus, Plus, Megaphone, AlertTriangle, ClipboardCheck, MessageSquareText,
  UserRoundPlus, ChevronRight, CheckCircle2, AlertCircle, Info, CalendarDays, Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MembershipChart } from "@/components/membership-chart"
import { OffertoryChart } from "@/components/offertory-chart"
import { RecentActivities } from "@/components/recent-activities"
import { EmptyState, Page, PageHeader, StatCard } from "@/components/page"
import type { AttentionItem, CalendarRange, DashboardStats, SundaySnapshot } from "@/lib/types"
import { qs, useApi } from "@/lib/api"
import { KIND_META } from "@/lib/calendar"
import { useAuth } from "@/lib/auth"
import { money } from "@/lib/format"
import { cn } from "@/lib/utils"

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

const todayLabel = () => new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })

/**
 * The church office's start page. Leads with what needs doing ("Needs attention") and last Sunday, then the
 * figures each role works with: the treasurer sees money first, the pastor and secretary see people first.
 * Every block is shown only to roles that may open the page behind it.
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
  const firstName = user?.name.split(" ")[0]
  // the treasurer's day starts with money; everyone else's with people
  const moneyFirst = finance && can("finance.manage") && !can("members.manage")

  const peopleCards = people && (
    <>
      <StatCard label="Members" icon={Users} value={stats?.totalMembers?.toLocaleString()} trend={stats?.membersChange ?? undefined} hint="vs last month" />
      <StatCard
        label="Active members"
        icon={UserCheck}
        tone="success"
        value={stats?.activeMembers?.toLocaleString()}
        hint={stats && (stats.attendanceRate === null
          ? `${Math.round(((stats.activeMembers ?? 0) / Math.max(stats.totalMembers ?? 0, 1)) * 100)}% of the congregation`
          : `${stats.attendanceRate}% attendance`)}
      />
      <StatCard label="Sunday school" icon={GraduationCap} tone="info" value={stats?.sundaySchool?.toLocaleString()} hint="Members enrolled" />
    </>
  )
  const moneyCard = finance && (
    <StatCard label="Offertory this month" icon={HandCoins} tone="gold" value={stats && money(stats.monthlyOffertory)} trend={stats?.offertoryChange ?? undefined} hint="vs last month" />
  )
  const offertoryChart = finance && stats && <OffertoryChart data={stats.offertoryTrends} />
  const membershipChart = people && stats?.membershipByGender && <MembershipChart data={stats.membershipByGender} />
  const charts = moneyFirst ? [offertoryChart, membershipChart] : [finance ? offertoryChart : membershipChart, finance ? membershipChart : null]
  const [mainChart, sideChart] = charts.filter(Boolean)

  return (
    <Page>
      <PageHeader eyebrow={todayLabel()} title={`${greeting()}${firstName ? `, ${firstName}` : ""}`} description="Here's how the church family is doing, and what needs you today." actions={<QuickActions />} />

      {error ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load the overview" description={error.message} />
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-3"><NeedsAttention /></div>
            <div className="min-w-0 lg:col-span-2"><ThisSunday /></div>
          </section>

          <section className={cn("grid gap-4 sm:grid-cols-2", people && finance ? "xl:grid-cols-4" : people ? "xl:grid-cols-3" : "xl:grid-cols-1")}>
            {moneyFirst ? <>{moneyCard}{peopleCards}</> : <>{peopleCards}{moneyCard}</>}
          </section>

          {stats ? (
            <>
              {(mainChart || sideChart) && (
                <section className="grid gap-6 lg:grid-cols-5">
                  <div className={sideChart ? "lg:col-span-3" : "lg:col-span-5"}>{mainChart}</div>
                  {sideChart && <div className="lg:col-span-2">{sideChart}</div>}
                </section>
              )}
              <section className="grid gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3"><RecentActivities activities={stats.recentActivities} /></div>
                <div className="space-y-6 lg:col-span-2">
                  <ComingUp />
                  <QuickLinks />
                </div>
              </section>
            </>
          ) : (
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="h-80 animate-pulse rounded-2xl bg-muted lg:col-span-3" />
              <div className="h-80 animate-pulse rounded-2xl bg-muted lg:col-span-2" />
            </div>
          )}
        </>
      )}
    </Page>
  )
}

/** The everyday tasks, limited to what the user's role may do. */
function QuickActions() {
  const { can } = useAuth()
  const actions = [
    { href: "/offertory", label: "Record offering", icon: Plus, perm: "finance.manage", primary: true },
    { href: "/attendance", label: "Attendance", icon: ClipboardCheck, perm: "members.manage" },
    { href: "/visitors", label: "Log visitor", icon: UserRoundPlus, perm: "members.manage" },
    { href: "/members", label: "Add member", icon: UserPlus, perm: "members.manage" },
    { href: "/sms", label: "Send SMS", icon: MessageSquareText, perm: "sms.send" },
  ].filter((a) => can(a.perm)).slice(0, 4)
  const primary = actions.find((a) => a.primary) ?? actions[0]
  return (
    <>
      {actions.map((a) => (
        <Button key={a.href} variant={a === primary ? "default" : "outline"} asChild>
          <Link href={a.href}><a.icon className="size-4" /> {a.label}</Link>
        </Button>
      ))}
    </>
  )
}

const SEVERITY = {
  danger: { icon: AlertCircle, dot: "bg-destructive", text: "text-destructive", badge: "bg-destructive/10 text-destructive" },
  warning: { icon: AlertTriangle, dot: "bg-warning", text: "text-warning", badge: "bg-warning/15 text-[color-mix(in_oklch,var(--warning)_70%,black)] dark:text-warning" },
  info: { icon: Info, dot: "bg-info", text: "text-info", badge: "bg-info/10 text-info" },
} as const
const AREA = { care: "Pastoral", registers: "Registers", money: "Money", admin: "Admin" } as const

/** What someone in the office should act on, most urgent first; each row opens the page that resolves it. */
function NeedsAttention() {
  const { data } = useApi<AttentionItem[]>("/dashboard/attention", { refreshInterval: 5 * 60_000 })
  const total = data?.reduce((n, i) => n + i.count, 0) ?? 0
  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Needs attention</h2>
          <p className="text-xs text-muted-foreground">Things waiting on the office, most urgent first</p>
        </div>
        {data && data.length > 0 && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold tabular text-primary">{total}</span>}
      </div>
      {!data ? (
        <div className="space-y-3 p-5">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <CheckCircle2 className="size-10 text-success" />
          <p className="font-semibold">All caught up</p>
          <p className="max-w-xs text-sm text-muted-foreground">Nothing is waiting on you right now. Visitors, follow-ups, Sunday records and money checks will show up here.</p>
        </div>
      ) : (
        <ul className="divide-y">
          {data.map((item) => {
            const s = SEVERITY[item.severity]
            return (
              <li key={item.key}>
                <Link href={item.href} className="group flex items-center gap-3 px-5 py-3 transition hover:bg-muted/50">
                  <s.icon className={cn("size-5 shrink-0", s.text)} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                      {item.title}
                      <span className="text-[11px] font-normal uppercase tracking-wider text-muted-foreground">{AREA[item.area]}</span>
                    </p>
                    {item.detail && <p className="truncate text-xs text-muted-foreground" title={item.detail}>{item.detail}</p>}
                  </div>
                  <span className={cn("min-w-7 rounded-full px-2 py-0.5 text-center text-sm font-semibold tabular", s.badge)}>{item.count}</span>
                  <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
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
  if (!data) return <Card className="h-full min-h-64 animate-pulse bg-muted" />
  const day = new Date(`${data.date}T00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
  const t = data.totals
  const recorded = data.services.some((s) => (s.attendance ?? 0) > 0 || (s.giving ?? 0) > 0)
  return (
    <Card className="h-full gap-0 p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Last Sunday</h2>
          <p className="text-xs text-muted-foreground">{day}</p>
        </div>
        <CalendarDays className="size-5 text-muted-foreground" />
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
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="size-3.5" /> In church</p>
                <p className="text-2xl font-semibold tabular">{t.attendance.toLocaleString()}</p>
                <Delta now={t.attendance} before={t.attendancePrev} label="last week" />
                {!!t.visitors && <p className="text-xs text-muted-foreground">incl. {t.visitors} visitor{t.visitors === 1 ? "" : "s"}</p>}
              </div>
            )}
            {data.showGiving && t.giving !== null && (
              <div className="rounded-xl border p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet className="size-3.5" /> Offertory</p>
                <p className="text-2xl font-semibold tabular">{money(t.giving)}</p>
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
                  {data.showAttendance && <td className="py-1.5 text-right tabular">{s.attendance ?? <span className="text-xs text-warning">not recorded</span>}</td>}
                  {data.showGiving && <td className="py-1.5 text-right tabular">{s.giving ? money(s.giving) : <span className="text-xs text-warning">not recorded</span>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  )
}

function QuickLinks() {
  const { can } = useAuth()
  const links = [
    { href: "/members", label: "Members directory", note: "Find, add and update members", icon: Users, perm: "members.view" },
    { href: "/ministries", label: "Ministries", note: "Groups, leaders and activities", icon: UserCheck, perm: "members.view" },
    { href: "/projects", label: "Projects & giving", note: "Land, building and other causes", icon: HandCoins, perm: "finance.view" },
    { href: "/notifications", label: "Announcements", note: "Messages for the staff", icon: Megaphone },
  ].filter((l) => !l.perm || can(l.perm))

  return (
    <div className="space-y-3">
      <h2 className="px-1 text-lg font-semibold">Go to</h2>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="group flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <l.icon className="size-[18px]" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">{l.label}</span>
            <span className="block text-xs text-muted-foreground">{l.note}</span>
          </span>
          <span className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary">→</span>
        </Link>
      ))}
    </div>
  )
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
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">This week</h2>
        <Link href="/calendar" className="text-sm text-primary hover:underline">Calendar →</Link>
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
