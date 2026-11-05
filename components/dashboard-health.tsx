"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { AlertCircle, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { axisProps, gridProps, legendProps, tooltipProps } from "@/lib/chart"
import { CURRENCY, compact, money } from "@/lib/format"
import type { DashboardHealth, HealthCard } from "@/lib/types"
import { cn } from "@/lib/utils"

/** "UGX 4.2M" on the card; the exact figure is in the tooltip. */
export const short = (n: number, format: "money" | "number") => (format === "money" ? `${CURRENCY} ${compact(n)}` : n.toLocaleString())

// Colour only when something is off: calm cards stay neutral, with no label at all.
const STATUS = {
  act: { label: "Act now", icon: AlertCircle, card: "border-destructive/40 bg-destructive/[0.04]", chip: "bg-destructive/10 text-destructive", line: "var(--destructive)" },
  watch: { label: "Watch", icon: AlertTriangle, card: "border-warning/50 bg-warning/[0.05]", chip: "bg-warning/15 text-[color-mix(in_oklch,var(--warning)_70%,black)] dark:text-warning", line: "var(--warning)" },
  good: { label: null, icon: null, card: "", chip: "", line: "var(--chart-1)" },
  neutral: { label: null, icon: null, card: "", chip: "", line: "var(--muted-foreground)" },
} as const

/** A row of health cards: swipeable on a phone, a strip across the decision column on a screen. */
export function HealthCards({ cards, compact: slim }: { cards: HealthCard[] | undefined; compact?: boolean }) {
  const n = cards?.length ?? 4
  if (slim) {
    if (!cards) return <section className="grid gap-3 sm:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className="h-[76px] animate-pulse rounded-2xl bg-muted" />)}</section>
    return <section aria-label="Money" className={cn("grid gap-3", n >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>{cards.map((c) => <SlimTile key={c.key} c={c} />)}</section>
  }
  const grid = cn("-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0",
    n >= 4 ? "sm:grid-cols-2 xl:grid-cols-4" : n === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")
  if (!cards) return <section className={grid}>{[1, 2, 3, 4].map((i) => <div key={i} className="h-[184px] min-w-[72%] animate-pulse rounded-2xl bg-muted sm:min-w-0" />)}</section>
  return <section aria-label="Health" className={grid}>{cards.map((c) => <HealthTile key={c.key} c={c} />)}</section>
}

/** One line: label, value and status; the cause underneath. For a strip of money figures. */
function SlimTile({ c }: { c: HealthCard }) {
  const s = STATUS[c.status]
  return (
    <Link href={c.href} className={cn("flex min-w-0 items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-soft transition hover:border-primary/30", s.card)}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <span className="truncate">{c.label}</span>
          {s.label && s.icon && <span className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 text-[10px] normal-case tracking-normal", s.chip)}><s.icon className="size-3" />{s.label}</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground" title={c.cause ?? undefined}>{c.unit}{c.cause ? ` · ${c.cause}` : ""}</p>
      </div>
      <p className="shrink-0 text-lg font-semibold tabular" title={c.value === null ? undefined : money(c.value)}>{c.value === null ? "—" : short(c.value, c.format)}</p>
    </Link>
  )
}

/**
 * Every card has the same rows at the same heights (label, value, trend, comparison, cause), so the
 * values and trend lines line up across the strip even when a card has no trend line.
 */
function HealthTile({ c }: { c: HealthCard }) {
  const s = STATUS[c.status]
  const pct = c.compare?.pct
  return (
    <Link href={c.href} className={cn("group grid min-w-[72%] snap-start grid-cols-[minmax(0,1fr)] grid-rows-[20px_32px_18px_30px_auto] rounded-2xl border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30 sm:min-w-0", s.card)}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{c.label}</p>
        {s.label && s.icon && (
          <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold", s.chip)}><s.icon className="size-3" />{s.label}</span>
        )}
      </div>
      <p className="self-end whitespace-nowrap text-2xl font-semibold leading-none tracking-tight tabular" title={c.value === null ? undefined : c.format === "money" ? money(c.value) : c.value.toLocaleString()}>
        {c.value === null ? "—" : short(c.value, c.format)}
      </p>
      <p className="truncate text-xs text-muted-foreground">{c.unit}</p>
      {c.spark.length > 1 ? <Sparkline values={c.spark} color={s.line} label={c.sparkLabel ?? ""} format={c.format} /> : <span aria-hidden />}
      <div className="mt-2 space-y-0.5 border-t pt-2 text-xs">
        {c.compare ? (
          <p className="line-clamp-2 text-muted-foreground">
            <span className={cn("font-semibold tabular", pct! > 0 ? "text-success" : pct! < 0 ? (c.status === "good" ? "text-foreground" : "text-destructive") : "text-foreground")}>
              {pct! > 0 ? "▲ +" : pct! < 0 ? "▼ " : ""}{Math.round(pct!)}%
            </span>{" "}
            vs {c.compare.label}
          </p>
        ) : <p className="truncate text-muted-foreground">{c.key === "giving" ? "No figures from last year yet" : "\u00a0"}</p>}
        <p className="line-clamp-2 min-h-8 text-muted-foreground" title={c.cause ?? undefined}>{c.cause ?? "\u00a0"}</p>
      </div>
    </Link>
  )
}

/** A tiny trend line as wide as its card; the last point is marked and every point has its value on hover. */
function Sparkline({ values, color, label, format }: { values: number[]; color: string; label: string; format: "money" | "number" }) {
  const [hover, setHover] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(120)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(40, Math.round(e.contentRect.width))))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  const h = 30, pad = 4
  const max = Math.max(...values), min = Math.min(...values)
  const x = (i: number) => pad + (i * (w - pad * 2)) / (values.length - 1)
  const y = (v: number) => (max === min ? h / 2 : h - pad - ((v - min) / (max - min)) * (h - pad * 2))
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")
  const i = hover ?? values.length - 1
  return (
    <div ref={ref} className="relative self-center" onMouseLeave={() => setHover(null)}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${label}: ${values.map((v) => short(v, format)).join(", ")}`} className="block"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setHover(Math.max(0, Math.min(values.length - 1, Math.round(((e.clientX - r.left - pad) / (r.width - pad * 2)) * (values.length - 1)))))
        }}>
        <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(i)} cy={y(values[i])} r={3.5} fill={color} stroke="var(--card)" strokeWidth={2} />
      </svg>
      {hover !== null && (
        <span className="pointer-events-none absolute -top-6 right-0 whitespace-nowrap rounded-md border bg-popover px-1.5 py-0.5 text-[11px] font-medium tabular shadow-sm">
          {short(values[hover], format)} · {values.length - 1 - hover === 0 ? "latest" : `${values.length - 1 - hover} ${label.includes("month") ? "mo" : "wk"} ago`}
        </span>
      )}
    </div>
  )
}

/** How fresh the figures are, and what isn't entered yet, so nobody decides on half a week. */
export function DataStatus({ status }: { status: DashboardHealth["dataStatus"] | undefined }) {
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 60_000); return () => clearInterval(t) }, [])
  if (!status) return null
  const mins = Math.max(0, Math.round((Date.now() - new Date(status.asOf).getTime()) / 60_000))
  return <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> Updated {mins < 1 ? "just now" : `${mins} min ago`}</span>
}

/** Collections through the year so far, against last year (and the target): are we ahead or behind? */
export function GivingYearChart({ data, height = 250 }: { data: NonNullable<DashboardHealth["givingYear"]>; height?: number }) {
  let a = 0, b = 0, t = 0
  const rows = data.months.map((m) => {
    b += m.lastYear
    t += m.target ?? 0
    if (m.thisYear !== null) a += m.thisYear
    const thisYear = m.thisYear === null ? null : a
    return { month: m.month, thisYear, lastYear: b, target: m.target === null ? null : t, gap: thisYear === null ? null : [Math.min(thisYear, b), Math.max(thisYear, b)] as [number, number] }
  })
  const lastIdx = rows.findLastIndex((r) => r.thisYear !== null)
  const now = rows[lastIdx]
  const base = data.target ? now?.target : now?.lastYear
  const hasBase = !!base && base > 0
  const diff = hasBase && now?.thisYear != null ? Math.round(((now.thisYear - base!) / base!) * 100) : null
  const ahead = diff !== null && diff >= 0
  const hasLastYear = rows.some((r) => r.lastYear > 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Collections through {data.yearLabel}</CardTitle>
        <CardDescription className="text-base text-foreground/80">
          {now?.thisYear != null ? <><b className="text-foreground">{money(now.thisYear)}</b> so far</> : "Nothing given yet this year"}
          {diff !== null && <>, <span className={cn("font-semibold", ahead ? "text-success" : "text-destructive")}>{ahead ? "▲" : "▼"} {Math.abs(diff)}% {ahead ? "ahead of" : "behind"}</span> {data.target ? "the target" : "last year"} at this point</>}
          {diff === null && !hasLastYear && " · last year's figures will show here once there are some"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} width={56} tickFormatter={(v) => compact(Number(v))} />
            <Tooltip {...tooltipProps} cursor={{ stroke: "var(--border)" }}
              formatter={(v, name) => [money(Number(v)), name]}
              itemSorter={(i) => (i.dataKey === "thisYear" ? 0 : 1)} />
            <Legend {...legendProps} payload={[
              { value: "This year", type: "line", color: "var(--chart-1)", id: "a" },
              ...(hasLastYear ? [{ value: "Last year", type: "line" as const, color: "var(--muted-foreground)", id: "b" }] : []),
              ...(data.target ? [{ value: "Target", type: "line" as const, color: "var(--chart-4)", id: "t" }] : []),
            ]} />
            <defs>
              <linearGradient id="giving-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            {hasLastYear && <Line type="monotone" dataKey="lastYear" name="Last year" stroke="var(--muted-foreground)" strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} />}
            {data.target && <Line type="monotone" dataKey="target" name="Target" stroke="var(--chart-4)" strokeWidth={2} strokeDasharray="2 4" dot={false} activeDot={{ r: 4 }} />}
            <Area type="monotone" dataKey="thisYear" name="This year" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#giving-fill)" dot={false} activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }} connectNulls={false} animationDuration={800} />
          </ComposedChart>
        </ResponsiveContainer>
        <details className="mt-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">Show as a table</summary>
          <table className="mt-2 w-full tabular">
            <thead><tr className="text-left"><th className="py-1 font-medium">Month</th><th className="text-right font-medium">This year</th><th className="text-right font-medium">Last year</th>{data.target && <th className="text-right font-medium">Target</th>}</tr></thead>
            <tbody>{data.months.map((m) => <tr key={m.month} className="border-t"><td className="py-1">{m.month}</td><td className="text-right">{m.thisYear === null ? "—" : money(m.thisYear)}</td><td className="text-right">{money(m.lastYear)}</td>{data.target && <td className="text-right">{money(m.target ?? 0)}</td>}</tr>)}</tbody>
          </table>
        </details>
      </CardContent>
    </Card>
  )
}


const TONE_LINE = { good: "decoration-success", watch: "decoration-warning", bad: "decoration-destructive", neutral: "decoration-border" } as const

/** "Mostly good: attendance up 20%, 16 members drifting away, and 3 things need you today." Each part links to its evidence. */
export function Verdict({ verdict }: { verdict: DashboardHealth["verdict"] | undefined }) {
  if (!verdict) return <span className="inline-block h-5 w-80 max-w-full animate-pulse rounded bg-muted align-middle" />
  const parts = verdict.parts
  return (
    <>
      <span className="font-medium text-foreground">{verdict.opening}:</span>{" "}
      {parts.map((p, i) => (
        <span key={p.text}>
          {i > 0 && (i === parts.length - 1 ? ", and " : ", ")}
          {p.href ? (
            <Link href={p.href} className={cn("underline decoration-2 underline-offset-4 hover:text-foreground", TONE_LINE[p.tone])}>{p.text}</Link>
          ) : (
            <span className={cn("underline decoration-2 underline-offset-4", TONE_LINE[p.tone])}>{p.text}</span>
          )}
        </span>
      ))}
      .
    </>
  )
}

const SEGMENT = {
  new: { name: "New", bar: "bg-[var(--chart-2)]" },
  regular: { name: "Regular", bar: "bg-primary" },
  occasional: { name: "Occasional", bar: "bg-primary/45" },
  drifting: { name: "Drifting", bar: "bg-warning" },
  lost: { name: "Gone quiet", bar: "bg-destructive/70" },
  unknown: { name: "No record", bar: "bg-muted-foreground/35" },
} as const

const LAST_WHAT: Record<string, string> = { gave: "last gave", contributed: "last contributed", "Sunday school": "last at Sunday school" }

/** Where members are: each group is a list to act on, with the drifting members most worth a call. */
export function EngagementCard({ data }: { data: NonNullable<DashboardHealth["engagement"]> }) {
  const max = Math.max(1, ...data.segments.map((s) => s.count))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">How engaged are members</CardTitle>
        <CardDescription>{data.total} active members, going by giving, contributions and Sunday school recorded by name. Sunday headcounts aren&apos;t per person.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ul className="space-y-1">
          {data.segments.map((s) => {
            const meta = SEGMENT[s.key]
            const pct = data.total ? Math.round((s.count / data.total) * 100) : 0
            return (
              <li key={s.key}>
                <Link href={`/members?engagement=${s.key}`} title={s.label} className="group grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition hover:bg-muted/60">
                  <span className={cn("truncate", s.key === "drifting" && s.count > 0 && "font-semibold")}>{meta.name}</span>
                  <span className="h-2.5 rounded-full bg-muted"><span className={cn("block h-full rounded-full", meta.bar)} style={{ width: `${(s.count / max) * 100}%` }} /></span>
                  <span className="text-right tabular"><b>{s.count}</b> <span className="text-xs text-muted-foreground">{pct}%</span></span>
                </Link>
              </li>
            )
          })}
        </ul>
        {data.drifting.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Worth a call this week</h3>
              <Link href="/members?engagement=drifting" className="text-xs text-primary hover:underline">All drifting →</Link>
            </div>
            <ul className="divide-y rounded-xl border text-sm">
              {data.drifting.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2">
                  <Link href={`/members?q=${encodeURIComponent(m.name)}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium hover:underline">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {LAST_WHAT[m.lastWhat ?? ""] ?? "last seen"} {new Date(`${m.lastSeen}T00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      {m.lastVisit ? ` · visited ${new Date(`${m.lastVisit}T00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : " · not visited"}
                    </p>
                  </Link>
                  {m.phone && <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`} className="shrink-0 rounded-md border px-2 py-1 text-xs font-medium hover:border-primary/40 hover:text-primary">Call</a>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
