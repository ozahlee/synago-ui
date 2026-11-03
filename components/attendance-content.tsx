"use client"

import { useEffect, useState } from "react"
import { mutate } from "swr"
import { ChevronLeft, ChevronRight, ClipboardCheck, Percent, Users, Baby, Save } from "lucide-react"
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

const FIELDS = ["men", "women", "children", "visitors"] as const

export function AttendanceContent() {
  const { can } = useAuth()
  const canEdit = can("members.manage")
  const [day, setDay] = useState(lastSunday())
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

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Head count</h2>
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
    </Page>
  )
}
