"use client"

import Link from "next/link"
import { useState } from "react"
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronDown, History } from "lucide-react"
import { DataStatus, short } from "@/components/dashboard-health"
import type { DashboardHealth } from "@/lib/types"
import { cn } from "@/lib/utils"

type Position = DashboardHealth["position"]
type View = "pastor" | "treasurer" | "office"

const TONE = {
  good: { dot: "bg-success", card: "border-success/25 bg-success/[0.05]", text: "text-success" },
  watch: { dot: "bg-warning", card: "border-warning/35 bg-warning/[0.06]", text: "text-warning" },
  bad: { dot: "bg-destructive", card: "border-destructive/30 bg-destructive/[0.05]", text: "text-destructive" },
  neutral: { dot: "bg-muted-foreground", card: "bg-card", text: "text-foreground" },
} as const

const ugx = (n: number) => short(n, "money")
const day = (d: string, o: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) => new Date(`${d}T00:00`).toLocaleDateString(undefined, o)

function Change({ pct }: { pct: number | null }) {
  if (pct === null || pct === 0) return null
  const up = pct > 0
  const I = up ? ArrowUpRight : ArrowDownRight
  return <span className={cn("inline-flex items-center text-xs font-semibold tabular", up ? "text-success" : "text-destructive")}><I className="size-3.5" />{Math.abs(pct)}%</span>
}

/** One fact in the row under the headline: a label, then the figures, the whole thing a link to its evidence. */
function Fact({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group min-w-0 rounded-xl px-3 py-2 transition-colors hover:bg-foreground/[0.04]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-sm text-muted-foreground group-hover:[&_b]:underline">{children}</p>
    </Link>
  )
}

const flagFor = (p: Position, view: View) => p.flags.find((f) => view !== "office" || f.area !== "money") ?? null

function tone(p: Position, view: View): keyof typeof TONE {
  if (p.money && view !== "office") return p.money.tone
  if (flagFor(p, view)?.severity === "danger") return "bad"
  if (p.sunday?.missingServices) return "watch"
  return "neutral"
}

/**
 * The church's position at the top of the dashboard. With money: what is free to spend and what is left
 * once the next 30 days' commitments are paid (opens to the list). Then last Sunday, this month and the
 * most serious flag, each linking to its evidence. The office view leads with last Sunday instead.
 */
export function PositionBanner({ position: p, status, view, onChanges }: { position: Position | undefined; status: DashboardHealth["dataStatus"] | undefined; view: View; onChanges: () => void }) {
  const [open, setOpen] = useState<boolean | null>(null)
  if (!p) return <div className="h-36 animate-pulse rounded-2xl bg-muted" />
  const t = TONE[tone(p, view)]
  const m = view === "office" ? null : p.money
  const showLines = open ?? view === "treasurer"
  const s = p.sunday
  const flag = flagFor(p, view)

  const sundayFact = s && (
    <Fact key="sunday" href={s.href} label={`Last Sunday · ${day(s.date, { day: "numeric", month: "short" })}`}>
      {s.attendance !== null && <><b className="text-foreground tabular">{s.attendance.toLocaleString()}</b> in church <Change pct={s.attendanceChange} /></>}
      {s.attendance !== null && s.collection !== null && <span aria-hidden>·</span>}
      {s.collection !== null && <><b className="text-foreground tabular">{ugx(s.collection)}</b> collected <Change pct={s.collectionChange} /></>}
      {!!s.visitors && <><span aria-hidden>·</span> {s.visitors} visitors</>}
    </Fact>
  )
  const monthFact = p.month && (
    <Fact key="month" href={p.month.href} label={`${p.month.label} so far`}>
      In <b className="text-foreground tabular">{ugx(p.month.in)}</b> <span aria-hidden>·</span> Out <b className="text-foreground tabular">{ugx(p.month.out)}</b>
      <span className={cn("font-semibold tabular", p.month.net >= 0 ? "text-success" : "text-destructive")}>({p.month.net >= 0 ? "+" : "−"}{ugx(Math.abs(p.month.net))})</span>
    </Fact>
  )
  const flagFact = flag && (
    <Fact key="flag" href={flag.href} label="Most serious">
      <AlertTriangle className={cn("size-3.5 shrink-0 self-center", flag.severity === "danger" ? "text-destructive" : "text-warning")} />
      <b className="text-foreground">{flag.title}</b>{flag.detail && <span className="truncate">{flag.detail}</span>}
    </Fact>
  )
  const missingFact = view === "office" && s && s.missingServices > 0 && (
    <Fact key="missing" href={`/attendance?date=${s.date}`} label="Not recorded yet">
      <b className="text-foreground">{s.missingServices} {s.missingServices === 1 ? "service" : "services"}</b> without a headcount
    </Fact>
  )
  const facts = (view === "treasurer" ? [monthFact, sundayFact, flagFact] : view === "office" ? [missingFact, flagFact] : [sundayFact, monthFact, flagFact]).filter(Boolean)

  return (
    <section aria-label="Church position" className={cn("rounded-2xl border shadow-soft", t.card)}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.14em]"><span className={cn("size-2 rounded-full", t.dot)} aria-hidden />Church position</span>
        <span className="flex items-center gap-3"><DataStatus status={status} /><button type="button" onClick={onChanges} className="inline-flex items-center gap-1 hover:text-foreground"><History className="size-3.5" /> What changed</button></span>
      </div>

      <div className="px-5 pb-1 pt-2">
        {m ? (
          <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
            <Link href="/accounting?tab=balance-sheet" className="group">
              <p className="text-3xl font-semibold tracking-tight tabular group-hover:underline md:text-4xl">{ugx(m.free)}</p>
              <p className="text-sm text-muted-foreground">free to spend <span className="text-xs">({ugx(m.restricted)} held for projects & welfare)</span></p>
            </Link>
            <button type="button" onClick={() => setOpen(!showLines)} aria-expanded={showLines} className="group pb-0.5 text-left">
              <p className={cn("text-lg font-semibold tabular md:text-xl", m.after < 0 ? "text-destructive" : "text-foreground")}>
                {m.after < 0 ? <>Short by {ugx(-m.after)}</> : <>{ugx(m.after)} left</>}
              </p>
              <p className="inline-flex items-center gap-1 text-sm text-muted-foreground group-hover:text-foreground">
                after {ugx(m.due)} due by {day(m.until, { day: "numeric", month: "short" })}<ChevronDown className={cn("size-4 transition-transform", showLines && "rotate-180")} />
              </p>
            </button>
          </div>
        ) : s ? (
          <Link href={s.href} className="group block">
            <p className="text-3xl font-semibold tracking-tight tabular group-hover:underline md:text-4xl">{(s.attendance ?? 0).toLocaleString()} <span className="text-lg font-normal text-muted-foreground">in church last Sunday</span> <Change pct={s.attendanceChange} /></p>
            <p className="text-sm text-muted-foreground">{day(s.date, { weekday: "long", day: "numeric", month: "long" })}{s.visitors ? ` · ${s.visitors} visitors to welcome` : ""}</p>
          </Link>
        ) : null}

        {m && showLines && (
          <ul className="mt-3 grid gap-x-6 gap-y-1 border-t pt-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {m.lines.length === 0 && <li className="text-muted-foreground">Nothing has to be paid in the next {m.days} days.</li>}
            {m.lines.map((l) => (
              <li key={l.key}>
                <Link href={l.href} className="flex items-baseline justify-between gap-3 rounded-md py-0.5 hover:underline">
                  <span className="min-w-0 truncate">{l.label}{l.note && <span className="ml-1 text-xs text-muted-foreground">{l.note}</span>}</span>
                  <b className="shrink-0 tabular">{ugx(l.amount)}</b>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {facts.length > 0 && <div className="mt-2 grid gap-1 border-t border-foreground/[0.06] px-2 py-2 md:grid-cols-3">{facts}</div>}
    </section>
  )
}

/** The slim version for the sticky bar once the banner scrolls away. */
export function positionLine(p: Position | undefined, view: View): { tone: keyof typeof TONE; text: string; head: string } | null {
  if (!p) return null
  const m = view === "office" ? null : p.money
  if (m) return { tone: m.tone, head: `${ugx(m.free)} free`, text: `${m.after < 0 ? `short by ${ugx(-m.after)}` : `${ugx(m.after)} left`} after what's due${p.sunday?.attendance != null ? ` · last Sunday ${p.sunday.attendance} in church` : ""}` }
  if (p.sunday) return { tone: tone(p, view), head: `${p.sunday.attendance ?? 0} in church`, text: flagFor(p, view)?.title ?? "last Sunday" }
  return null
}

export const POSITION_DOT = Object.fromEntries(Object.entries(TONE).map(([k, v]) => [k, v.dot])) as Record<keyof typeof TONE, string>
