"use client"

import Link from "next/link"
import { useId, useState } from "react"
import { Area, AreaChart, CartesianGrid, Cell, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Baby, Banknote, CalendarHeart, Coins, FolderKanban, HandCoins, HeartPulse, Landmark, Network, Receipt, Smartphone, Users, Wallet } from "lucide-react"
import { Card } from "@/components/ui/card"
import { axisProps, gridProps, legendProps, tooltipProps } from "@/lib/chart"
import { compact, money } from "@/lib/format"
import type { DashboardGlance, GlanceTile } from "@/lib/types"
import { cn } from "@/lib/utils"

const SECTION = "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
const ICON: Record<string, typeof Users> = { expenses: Receipt, bank: Landmark, members: Users, attendance: CalendarHeart, giving: HandCoins, sundaySchool: Baby, council: Network, payroll: Coins, projects: FolderKanban, care: HeartPulse }
// categorical series, in fixed order (never cycled)
const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"]

/** A tiny line, stretched to its box; the last point marked. */
function MiniSpark({ values, color = "var(--chart-1)" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const w = 100, h = 24
  const max = Math.max(...values), min = Math.min(...values)
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, max === min ? h / 2 : h - 2 - ((v - min) / (max - min)) * (h - 4)])
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-6 w-full" aria-hidden>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.8} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/** "Your church at a glance": one small tile per area the app runs. */
export function GlanceStrip({ tiles }: { tiles: GlanceTile[] | undefined }) {
  if (!tiles) return <div className="flex gap-3 overflow-hidden">{[...Array(6)].map((_, i) => <div key={i} className="h-[92px] min-w-40 flex-1 animate-pulse rounded-2xl bg-muted" />)}</div>
  return (
    <section aria-label="Your church at a glance" className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 xl:grid-cols-6">
      {tiles.map((t, i) => {
        const Icon = ICON[t.key] ?? Banknote
        return (
          <Link key={t.key} href={t.href} className={cn("group flex min-w-40 snap-start flex-col rounded-2xl border bg-card px-3.5 pb-2 pt-3 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30 sm:min-w-0", t.tone === "watch" && "border-warning/40")}>
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground" title={t.label}><Icon className="size-3.5 shrink-0" /><span className="truncate">{t.label}</span></p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="truncate text-lg font-semibold tracking-tight tabular">{t.value}</span>
              {t.change !== null && t.change !== 0 && <span className={cn("shrink-0 text-[11px] font-semibold tabular", t.change > 0 ? "text-success" : "text-destructive")}>{t.change > 0 ? "▲" : "▼"}{Math.abs(t.change)}%</span>}
            </p>
            <p className={cn("truncate text-[11px]", t.tone === "watch" ? "text-[color-mix(in_oklch,var(--warning)_70%,black)] dark:text-warning" : "text-muted-foreground")} title={t.sub ?? undefined}>{t.sub ?? " "}</p>
            <div className="mt-auto pt-1">{t.spark.length > 1 ? <MiniSpark values={t.spark} color={SERIES[i % 5]} /> : <span className="block h-6" />}</div>
          </Link>
        )
      })}
    </section>
  )
}

/** A breakdown as a donut, the total in the middle and a legend with shares and amounts: where collections come from, what is consuming the money. */
export function IncomeDonut({ data, large, title = "Where the money comes from", empty = "No income recorded yet." }: { data: NonNullable<DashboardGlance["incomeMix"]>; large?: boolean; title?: string; empty?: string }) {
  const [active, setActive] = useState<number | null>(null)
  const slices = data.slices
  const shown = active !== null ? slices[active] : null
  return (
    <Card className="h-full gap-0 p-5">
      <div className="mb-2 flex items-baseline justify-between"><h2 className={SECTION}>{title}</h2><span className="text-xs text-muted-foreground">this year</span></div>
      {slices.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p> : (
        <>
          <div className={cn("relative mx-auto", large ? "h-72 w-72" : "h-44 w-44")}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slices} dataKey="amount" nameKey="name" innerRadius="66%" outerRadius="100%" paddingAngle={2} cornerRadius={4} stroke="var(--card)" strokeWidth={2}
                  onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)} isAnimationActive animationDuration={700}>
                  {slices.map((_, i) => <Cell key={i} fill={SERIES[i]} opacity={active === null || active === i ? 1 : 0.35} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] text-muted-foreground">{shown ? shown.name : "Total"}</span>
              <span className={cn("font-semibold tabular", large ? "text-3xl" : "text-lg")}>{compact(shown ? shown.amount : data.total)}</span>
              {shown && <span className="text-[11px] text-muted-foreground">{Math.round((shown.amount / data.total) * 100)}%</span>}
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {slices.map((s, i) => (
              <li key={s.name} className={cn("flex items-center gap-2 rounded-md px-1 transition", active === i && "bg-muted")} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
                <span className="size-2.5 shrink-0 rounded-sm" style={{ background: SERIES[i] }} />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <span className="text-xs text-muted-foreground tabular">{Math.round((s.amount / data.total) * 100)}%</span>
                <span className="w-20 text-right tabular">{compact(s.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

/** The last 12 Sundays, each service stacked (Sunday school has its own report, not the dashboard). */
export function AttendanceByService({ data, height = 240 }: { data: NonNullable<DashboardGlance["attendanceByService"]>; height?: number }) {
  const gid = useId().replace(/:/g, "")
  const rows = data.weeks.map((w) => ({ ...w, label: new Date(`${w.date}T00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" }) }))
  const last = data.weeks.at(-1)
  const total = last ? data.services.reduce((a, s) => a + Number(last[s] ?? 0), 0) : 0
  return (
    <Card className="h-full gap-0 p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={SECTION}>Attendance by service</h2>
        <span className="text-sm text-muted-foreground">Last Sunday <b className="text-foreground tabular">{total}</b> in church</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            {data.services.map((s, i) => (
              <linearGradient key={s} id={`${gid}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES[i]} stopOpacity={0.55} /><stop offset="100%" stopColor={SERIES[i]} stopOpacity={0.08} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
          <YAxis {...axisProps} width={40} allowDecimals={false} />
          <Tooltip {...tooltipProps} cursor={{ stroke: "var(--border)" }} />
          <Legend {...legendProps} />
          {data.services.map((s, i) => <Area key={s} type="monotone" dataKey={s} stackId="svc" stroke={SERIES[i]} strokeWidth={2} fill={`url(#${gid}-${i})`} />)}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

/** Open projects as progress rings: raised against the target. */
export function ProjectRings({ projects, large }: { projects: NonNullable<DashboardGlance["projects"]>; large?: boolean }) {
  return (
    <Card className="h-full gap-0 p-5">
      <div className="mb-3 flex items-baseline justify-between"><h2 className={SECTION}>Projects</h2><Link href="/projects" className="text-xs text-primary hover:underline">All projects →</Link></div>
      {projects.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No open project with a target.</p> : (
        <ul className={cn("grid gap-4", large ? "grid-cols-2 gap-10 lg:grid-cols-4" : "grid-cols-2")}>
          {projects.map((p, i) => {
            const r = large ? 64 : 30, c = 2 * Math.PI * r, box = large ? 160 : 76, stroke = large ? 14 : 8
            return (
              <li key={p.id}>
                <Link href={`/projects/view?id=${p.id}`} className="group flex flex-col items-center text-center">
                  <span className="relative">
                    <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} role="img" aria-label={`${p.name}: ${p.pct}% of ${money(p.target)}`}>
                      <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
                      <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke={SERIES[i]} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p.pct / 100)} transform={`rotate(-90 ${box / 2} ${box / 2})`} className="transition-[stroke-dashoffset] duration-700" />
                    </svg>
                    <span className={cn("absolute inset-0 flex items-center justify-center font-semibold tabular", large ? "text-3xl" : "text-sm")}>{p.pct}%</span>
                  </span>
                  <span className={cn("mt-1.5 line-clamp-2 font-medium group-hover:underline", large ? "text-lg" : "text-xs")}>{p.name}</span>
                  <span className={cn("text-muted-foreground tabular", large ? "text-sm" : "text-[11px]")}>{compact(p.raised)} of {compact(p.target)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/**
 * Money in and money out, month by month: soft "natural" curves with a blurred haze under each line
 * (the smoky look) over a gradient fill. One axis, two series, a legend and a tooltip.
 */
export function MoneyFlowChart({ data, height = 260 }: { data: NonNullable<DashboardGlance["moneyFlow"]>; height?: number }) {
  const gid = useId().replace(/:/g, "")
  const IN = "var(--chart-4)", OUT = "var(--chart-5)"
  const net = data.collections - data.expenses
  const key = [{ k: "collections", c: IN, label: "All income (money in)" }, { k: "expenses", c: OUT, label: "Expenses (money out)" }]
  return (
    <Card className="h-full gap-0 p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={SECTION}>Money in & out · {data.yearLabel}</h2>
        <p className="text-sm text-muted-foreground">
          In <b className="text-foreground tabular">{compact(data.collections)}</b> · Out <b className="text-foreground tabular">{compact(data.expenses)}</b> ·{" "}
          <span className={cn("font-semibold tabular", net >= 0 ? "text-success" : "text-destructive")}>{net >= 0 ? "+" : "−"}{compact(Math.abs(net))} {net >= 0 ? "surplus" : "deficit"}</span>
        </p>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data.months} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
          <defs>
            {key.map(({ k, c }) => (
              <linearGradient key={k} id={`${gid}-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={0.45} /><stop offset="65%" stopColor={c} stopOpacity={0.1} /><stop offset="100%" stopColor={c} stopOpacity={0} />
              </linearGradient>
            ))}
            {/* the smoke: a soft blur, spread a little wider than the line */}
            <filter id={`${gid}-haze`} x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="7" /></filter>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} width={48} tickFormatter={(v) => compact(Number(v))} />
          <Tooltip {...tooltipProps} cursor={{ stroke: "var(--border)" }} formatter={(v, n) => [money(Number(v)), n === "collections" ? "All income" : "Expenses"]} />
          {key.map(({ k, c }) => (
            <Area key={`haze-${k}`} type="monotone" dataKey={k} stroke={c} strokeWidth={16} strokeOpacity={0.28} fill={c} fillOpacity={0.12} filter={`url(#${gid}-haze)`} tooltipType="none" activeDot={false} dot={false} isAnimationActive={false} connectNulls={false} />
          ))}
          {key.map(({ k, c }) => (
            <Area key={k} type="monotone" dataKey={k} stroke={c} strokeWidth={2.5} fill={`url(#${gid}-${k})`} dot={false} activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }} connectNulls={false} animationDuration={900} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {key.map(({ k, c, label }) => <span key={k} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: c }} />{label}</span>)}
      </div>
    </Card>
  )
}

const BANK_ICON = { cash: Wallet, mobile_money: Smartphone, bank: Landmark } as const

/** Money available now: every cash, mobile-money and bank account, and what is free once restricted funds are set aside. */
export function BankBalances({ data }: { data: NonNullable<DashboardGlance["banks"]> }) {
  const top = Math.max(1, ...data.accounts.map((a) => a.amount))
  return (
    <Card className="h-full gap-0 p-5">
      <div className="mb-3 flex items-baseline justify-between"><h2 className={SECTION}>Available balance</h2><Link href="/accounting?tab=balance-sheet" className="text-xs text-primary hover:underline">Balance sheet →</Link></div>
      <p className="text-3xl font-semibold tracking-tight tabular" title={money(data.total)}>{compact(data.total)}</p>
      <p className="text-sm text-muted-foreground">in cash, mobile money and bank</p>
      <ul className="mt-4 space-y-3">
        {data.accounts.map((a, i) => {
          const I = BANK_ICON[a.kind] ?? Banknote
          return (
            <li key={a.name}>
              <div className="flex items-center gap-2 text-sm">
                <I className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                <span className={cn("font-semibold tabular", a.amount < 0 && "text-destructive")}>{money(a.amount)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(0, (a.amount / top) * 100)}%`, background: SERIES[i % 5] }} /></div>
            </li>
          )
        })}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-sm">
        <div><p className="text-xs text-muted-foreground">Held for projects & welfare</p><p className="font-semibold tabular">{compact(data.restricted)}</p></div>
        <div><p className="text-xs text-muted-foreground">Free to spend</p><p className={cn("font-semibold tabular", data.free < 0 ? "text-destructive" : "text-success")}>{compact(data.free)}</p></div>
      </div>
    </Card>
  )
}

/** Each open project: raised against its target, and spent against its budget, as two slim bars. */
export function ProjectBreakdown({ projects }: { projects: NonNullable<DashboardGlance["projectBreakdown"]> }) {
  return (
    <Card className="h-full gap-0 p-5">
      <div className="mb-3 flex items-baseline justify-between"><h2 className={SECTION}>Projects</h2><Link href="/projects" className="text-xs text-primary hover:underline">All projects →</Link></div>
      {projects.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No open projects.</p> : (
        <ul className="space-y-4">
          {projects.slice(0, 5).map((p) => {
            const goal = p.target || p.budget
            const raisedPct = goal ? Math.min(100, (p.raised / goal) * 100) : 0
            const spentPct = p.budget ? Math.min(100, (p.spent / p.budget) * 100) : 0
            const over = p.budget > 0 && p.spent > p.budget
            return (
              <li key={p.id}>
                <Link href={`/projects/view?id=${p.id}`} className="group block">
                  <p className="flex items-baseline justify-between gap-2 text-sm"><span className="truncate font-medium group-hover:underline">{p.name}</span>{p.status === "planning" && <span className="shrink-0 text-[11px] text-muted-foreground">planning</span>}</p>
                  <div className="mt-1.5 space-y-1">
                    <Bar label="Raised" value={p.raised} of={goal} pct={raisedPct} color="var(--chart-4)" />
                    <Bar label="Spent" value={p.spent} of={p.budget} pct={spentPct} color={over ? "var(--destructive)" : "var(--chart-5)"} note={over ? "over budget" : undefined} />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function Bar({ label, value, of, pct, color, note }: { label: string; value: number; of: number; pct: number; color: string; note?: string }) {
  return (
    <div className="grid grid-cols-[44px_1fr_auto] items-center gap-2 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: color }} /></span>
      <span className={cn("tabular", note ? "font-semibold text-destructive" : "text-muted-foreground")}>{compact(value)}{of ? ` / ${compact(of)}` : ""}{note ? ` · ${note}` : ""}</span>
    </div>
  )
}
