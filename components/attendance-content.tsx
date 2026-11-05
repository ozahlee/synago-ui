"use client"

import { useEffect, useState } from "react"
import { mutate } from "swr"
import { ChevronLeft, ChevronRight, ClipboardCheck, Download, Percent, Printer, Users, Baby, Save } from "lucide-react"
import Link from "next/link"
import { useSettings } from "@/lib/settings"
import { cn } from "@/lib/utils"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Page, PageHeader, StatCard } from "@/components/page"
import { runAction } from "@/components/form"
import { put, qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { axisProps, gridProps, legendProps, tooltipProps } from "@/lib/chart"
import { lastSunday, longDate, shiftDays, today } from "@/lib/format"
import type { AttendanceDay, AttendanceRow, AttendanceTrends } from "@/lib/types"
import { usePeriod } from "@/lib/period"
import { PeriodFilter } from "@/components/period-filter"
import { useUrlParam } from "@/lib/use-url-param"

const FIELDS = ["men", "women", "children", "visitors"] as const

export function AttendanceContent() {
  const { can } = useAuth()
  const canEdit = can("members.manage")
  const [day, setDay] = useState(lastSunday())
  useUrlParam("date", (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today() && setDay(d))
  const { data } = useApi<AttendanceDay>(qs("/attendance/day", { date: day }))
  const period = usePeriod("this_year")
  const { data: trends } = useApi<AttendanceTrends>(qs("/attendance/trends", { from: period.range.from ?? undefined, to: period.range.to ?? undefined }))
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data) setRows(data.services)
  }, [data])

  const set = (i: number, field: (typeof FIELDS)[number], value: string) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [field]: Math.max(0, Number(value) || 0) } : row)))

  const rowTotal = (r: AttendanceRow) => r.men + r.women + r.children + r.visitors
  const dayTotal = rows.reduce((s, r) => s + rowTotal(r), 0)
  const dirty = data && JSON.stringify(rows.map((r) => FIELDS.map((f) => r[f]))) !== JSON.stringify(data.services.map((r) => FIELDS.map((f) => r[f])))

  const save = async () => {
    setSaving(true)
    const ok = await runAction(
      () => put("/attendance/day", { date: day, services: rows.map(({ service, men, women, children, visitors, notes }) => ({ service, men, women, children, visitors, notes })) }),
      `Attendance saved for ${longDate(day)}`,
    )
    setSaving(false)
    if (ok) mutate((k) => typeof k === "string" && (k.startsWith("/attendance") || k === "/dashboard"))
  }

  const chart = (trends?.days ?? []).map((d) => ({ ...d, label: longDate(d.date).replace(/,?\s\d{4}$/, "").replace(/^(\w{3})\w*/, "$1") }))
  const last = trends?.days.at(-1)

  return (
    <Page>
      <PageHeader eyebrow="Congregation" title="Attendance" description="Count each service on Sunday: men, women, children and visitors." />

      <PeriodFilter period={period} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Attendance rate"
          icon={Percent}
          tone="success"
          value={trends && (trends.attendanceRate === null ? "—" : `${trends.attendanceRate}%`)}
          hint={
            trends &&
            (trends.attendanceRate !== null && trends.attendanceRate > 100
              ? `More adults come than the ${trends.activeMembers} registered. Add regulars as members.`
              : `Adults vs ${trends.activeMembers} active members (last 4 Sundays)`)
          }
        />
        <StatCard label="Average Sunday" icon={Users} value={trends?.averageTotal.toLocaleString()} hint={`Everyone · ${period.label.toLowerCase()}`} />
        <StatCard label="Average adults" icon={ClipboardCheck} tone="info" value={trends?.averageAdults.toLocaleString()} hint="Men and women" />
        <StatCard
          label="Last recorded"
          icon={Baby}
          tone="gold"
          value={trends && (last ? last.total.toLocaleString() : "—")}
          hint={last ? `${longDate(last.date)} · ${last.children} children` : "Nothing recorded yet"}
        />
      </section>

      <Card id="headcount" className="scroll-mt-24 gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Head count{day === lastSunday() ? <span className="ml-2 text-sm font-normal text-muted-foreground">last Sunday</span> : null}</h2>
            <p className="text-sm text-muted-foreground">Leave a service at zero if it wasn&apos;t held.</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" aria-label="Previous week" onClick={() => setDay(shiftDays(day, -7))}>
              <ChevronLeft className="size-4" />
            </Button>
            <Input type="date" value={day} max={today()} onChange={(e) => e.target.value && setDay(e.target.value)} className="h-9 w-40" aria-label="Day" />
            <Button variant="outline" size="icon-sm" aria-label="Next week" disabled={shiftDays(day, 7) > today()} onClick={() => setDay(shiftDays(day, 7))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <th className="px-6 py-3 text-left">Service</th>
                {FIELDS.map((f) => (
                  <th key={f} className="px-3 py-3 text-center capitalize">
                    {f}
                  </th>
                ))}
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.service} className="border-b border-border/70">
                  <td className="px-6 py-3">
                    <p className="font-semibold">{r.service}</p>
                    <p className="text-xs text-muted-foreground">{r.recorded ? "Counted" : "Not counted yet"}</p>
                  </td>
                  {FIELDS.map((f) => (
                    <td key={f} className="px-2 py-2">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={r[f] || ""}
                        placeholder="0"
                        disabled={!canEdit}
                        onChange={(e) => set(i, f, e.target.value)}
                        className="mx-auto h-10 w-24 text-center tabular"
                        aria-label={`${r.service} ${f}`}
                      />
                    </td>
                  ))}
                  <td className="px-6 py-3 text-right text-base font-semibold tabular">{rowTotal(r)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-primary/5">
                <td className="px-6 py-3 font-semibold text-primary">Total for {longDate(day)}</td>
                {FIELDS.map((f) => (
                  <td key={f} className="px-3 py-3 text-center font-semibold tabular">
                    {rows.reduce((s, r) => s + r[f], 0)}
                  </td>
                ))}
                <td className="px-6 py-3 text-right text-lg font-bold text-primary tabular">{dayTotal}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {canEdit && (
          <div className="flex items-center justify-end gap-3 border-t bg-secondary/40 px-6 py-3">
            {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
            <Button onClick={save} disabled={saving || !dirty}>
              <Save className="size-4" /> {saving ? "Saving…" : "Save attendance"}
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{period.label}</CardTitle>
          <CardDescription>Everyone in church each Sunday, all services together</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart} barCategoryGap="25%">
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} width={36} allowDecimals={false} />
              <Tooltip {...tooltipProps} />
              <Legend {...legendProps} />
              <Bar dataKey="men" name="Men" stackId="a" fill="var(--chart-1)" />
              <Bar dataKey="women" name="Women" stackId="a" fill="var(--chart-2)" />
              <Bar dataKey="children" name="Children" stackId="a" fill="var(--chart-4)" />
              <Bar dataKey="visitors" name="Visitors" stackId="a" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <AttendanceHistory days={trends?.days} period={period.label} range={period.range} current={day}
        onOpen={(d) => { setDay(d); document.getElementById("headcount")?.scrollIntoView({ behavior: "smooth", block: "start" }) }} />
    </Page>
  )
}

/** Every recorded Sunday in the period, newest first: per service, by group, and the change from the week before. */
function AttendanceHistory({ days, period, range, current, onOpen }: { days: AttendanceTrends["days"] | undefined; period: string; range: { from: string | null; to: string | null }; current: string; onOpen: (date: string) => void }) {
  const { services } = useSettings()
  const list = [...(days ?? [])].reverse()
  // services that were ever counted in the period, in the church's own order
  const cols = services.filter((s) => list.some((d) => d.services.some((x) => x.service === s)))
  const svc = (d: AttendanceTrends["days"][number], name: string) => d.services.find((x) => x.service === name)?.total ?? null
  const csv = () => {
    const head = ["Date", ...cols, "Men", "Women", "Children", "Visitors", "Total"]
    const body = list.map((d) => [d.date, ...cols.map((c) => svc(d, c) ?? ""), d.men, d.women, d.children, d.visitors, d.total].join(","))
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv" }))
    a.download = `attendance-${list.at(-1)?.date ?? ""}-to-${list[0]?.date ?? ""}.csv`
    a.click()
  }
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Attendance report</h2>
          <p className="text-sm text-muted-foreground">Every Sunday counted · {period.toLowerCase()}. Click one to open it above.</p>
        </div>
        {list.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild><Link href={`/attendance/report?${new URLSearchParams({ from: range.from ?? "", to: range.to ?? "" })}`} target="_blank"><Printer className="size-4" /> Print report</Link></Button>
            <Button variant="outline" size="sm" onClick={csv}><Download className="size-4" /> CSV</Button>
          </div>
        )}
      </div>
      {!days ? <div className="m-6 h-40 animate-pulse rounded-xl bg-muted" /> : list.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">No Sundays counted in this period yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <th className="px-6 py-3 text-left">Sunday</th>
                {cols.map((c) => <th key={c} className="hidden px-3 py-3 text-right md:table-cell">{c}</th>)}
                <th className="hidden px-3 py-3 text-right lg:table-cell">Men</th>
                <th className="hidden px-3 py-3 text-right lg:table-cell">Women</th>
                <th className="hidden px-3 py-3 text-right lg:table-cell">Children</th>
                <th className="hidden px-3 py-3 text-right sm:table-cell">Visitors</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-6 py-3 text-right">vs week before</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d, i) => {
                const prev = list[i + 1]
                const diff = prev ? d.total - prev.total : null
                const pct = prev && prev.total ? Math.round(((d.total - prev.total) / prev.total) * 100) : null
                return (
                  <tr key={d.date} onClick={() => onOpen(d.date)} className={cn("cursor-pointer border-b border-border/70 transition hover:bg-muted/50", d.date === current && "bg-primary/5")}>
                    <td className="px-6 py-2.5">
                      <p className="font-medium">{new Date(`${d.date}T00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
                      <p className="text-xs text-muted-foreground md:hidden">{d.services.map((x) => `${x.service.replace(" Service", "")} ${x.total}`).join(" · ")}</p>
                    </td>
                    {cols.map((c) => <td key={c} className="hidden px-3 py-2.5 text-right tabular md:table-cell">{svc(d, c) ?? <span className="text-muted-foreground">—</span>}</td>)}
                    <td className="hidden px-3 py-2.5 text-right tabular lg:table-cell">{d.men}</td>
                    <td className="hidden px-3 py-2.5 text-right tabular lg:table-cell">{d.women}</td>
                    <td className="hidden px-3 py-2.5 text-right tabular lg:table-cell">{d.children}</td>
                    <td className="hidden px-3 py-2.5 text-right tabular sm:table-cell">{d.visitors}</td>
                    <td className="px-3 py-2.5 text-right text-base font-semibold tabular">{d.total}</td>
                    <td className={cn("px-6 py-2.5 text-right text-xs tabular", diff === null ? "text-muted-foreground" : diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground")}>
                      {diff === null ? "—" : `${diff > 0 ? "▲ +" : diff < 0 ? "▼ " : ""}${diff === 0 ? "same" : diff}${pct !== null && diff !== 0 ? ` (${pct > 0 ? "+" : ""}${pct}%)` : ""}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-secondary/50 text-xs text-muted-foreground">
                <td className="px-6 py-2.5 font-semibold">Average of {list.length} Sunday{list.length === 1 ? "" : "s"}</td>
                {cols.map((c) => { const v = list.map((d) => svc(d, c)).filter((x): x is number => x !== null); return <td key={c} className="hidden px-3 py-2.5 text-right tabular md:table-cell">{v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : "—"}</td> })}
                {(["men", "women", "children"] as const).map((k) => <td key={k} className="hidden px-3 py-2.5 text-right tabular lg:table-cell">{Math.round(list.reduce((a, d) => a + d[k], 0) / list.length)}</td>)}
                <td className="hidden px-3 py-2.5 text-right tabular sm:table-cell">{Math.round(list.reduce((a, d) => a + d.visitors, 0) / list.length)}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular text-foreground">{Math.round(list.reduce((a, d) => a + d.total, 0) / list.length)}</td>
                <td className="px-6 py-2.5" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  )
}
