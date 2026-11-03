"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Users, UserCheck, GraduationCap, HandCoins, UserPlus, Plus, Megaphone, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MembershipChart } from "@/components/membership-chart"
import { OffertoryChart } from "@/components/offertory-chart"
import { RecentActivities } from "@/components/recent-activities"
import { EmptyState, Page, PageHeader, StatCard } from "@/components/page"
import type { CalendarRange, DashboardStats } from "@/lib/types"
import { qs, useApi } from "@/lib/api"
import { KIND_META } from "@/lib/calendar"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"
import { money } from "@/lib/format"

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

const todayLabel = () => new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })

export function DashboardContent() {
  const { user, can } = useAuth()
  const router = useRouter()
  const broad = can("members.view") || can("finance.view")
  useEffect(() => {
    if (!broad) router.replace(can("groups.lead") ? "/my-groups" : "/announcements")
  }, [broad, can, router])
  const { data: stats, error } = useApi<DashboardStats>(broad ? "/dashboard" : null)
  const firstName = user?.name.split(" ")[0]

  const actions = (
    <>
      {can("members.manage") && (
        <Button variant="outline" asChild>
          <Link href="/members">
            <UserPlus className="size-4" /> Add member
          </Link>
        </Button>
      )}
      {can("finance.manage") && (
        <Button asChild>
          <Link href="/offertory">
            <Plus className="size-4" /> Record offering
          </Link>
        </Button>
      )}
    </>
  )

  return (
    <Page>
      <PageHeader
        eyebrow={todayLabel()}
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        description="Here's how the church family is doing."
        actions={actions}
      />

      {error ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load the overview" description={error.message} />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Members"
              icon={Users}
              value={stats?.totalMembers.toLocaleString()}
              trend={stats?.membersChange}
              hint="vs last month"
            />
            <StatCard
              label="Active members"
              icon={UserCheck}
              tone="success"
              value={stats?.activeMembers.toLocaleString()}
              hint={
                stats &&
                (stats.attendanceRate === null
                  ? `${Math.round((stats.activeMembers / Math.max(stats.totalMembers, 1)) * 100)}% of the congregation`
                  : `${stats.attendanceRate}% attendance`)
              }
            />
            <StatCard
              label="Sunday school"
              icon={GraduationCap}
              tone="info"
              value={stats?.sundaySchool.toLocaleString()}
              hint="Members enrolled"
            />
            <StatCard
              label="Offertory this month"
              icon={HandCoins}
              tone="gold"
              value={stats && money(stats.monthlyOffertory)}
              trend={stats?.offertoryChange}
              hint="vs last month"
            />
          </section>

          {stats ? (
            <>
              <section className="grid gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <OffertoryChart data={stats.offertoryTrends} />
                </div>
                <div className="lg:col-span-2">
                  <MembershipChart data={stats.membershipByGender} />
                </div>
              </section>
              <section className="grid gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <RecentActivities activities={stats.recentActivities} />
                </div>
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
