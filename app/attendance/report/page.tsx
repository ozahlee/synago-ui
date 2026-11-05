"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SundaySchoolReportView } from "@/components/sunday-school-report"
import { qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { longDate } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import type { AttendanceTrends } from "@/lib/types"

/** The attendance report for the PCC or the archdeaconry: every Sunday by service and group, averages, and Sunday school. */
function Report() {
  const params = useSearchParams()
  const from = params.get("from") || null
  const to = params.get("to") || null
  const router = useRouter()
  const { user, loading } = useAuth()
  const settings = useSettings()
  const { data: t } = useApi<AttendanceTrends>(user ? qs("/attendance/trends", { from: from ?? undefined, to: to ?? undefined }) : null)
  useEffect(() => { if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(`/attendance/report?${params.toString()}`)}`) }, [loading, user, router, params])
  if (!t) return <div className="m-10 h-[600px] animate-pulse rounded-2xl bg-muted" />

  const days = [...t.days].reverse()
  const cols = settings.services.filter((s) => days.some((d) => d.services.some((x) => x.service === s)))
  const svc = (d: AttendanceTrends["days"][number], s: string) => d.services.find((x) => x.service === s)?.total ?? null
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0)
  const sum = (k: "men" | "women" | "children" | "visitors" | "total") => days.reduce((a, d) => a + d[k], 0)
  const adults = sum("men") + sum("women")

  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-8 print:bg-white print:p-0">
      <style>{"@page { size: A4; margin: 14mm; }"}</style>
      <div className="mx-auto mb-6 flex max-w-4xl justify-end print:hidden"><Button onClick={() => window.print()}><Printer className="size-4" /> Print</Button></div>
      <article className="mx-auto max-w-4xl space-y-6 rounded-2xl bg-card p-8 shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{settings.churchName}</p>
          {settings.diocese && <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{settings.diocese}</p>}
          <h1 className="mt-2 text-2xl font-semibold">Attendance report</h1>
          <p className="text-sm text-muted-foreground">{from ? longDate(from) : "From the start"} to {longDate(to ?? new Date().toISOString().slice(0, 10))} · {days.length} Sunday{days.length === 1 ? "" : "s"} counted</p>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Average Sunday", t.averageTotal], ["Average adults", t.averageAdults], ["Children (average)", avg(days.map((d) => d.children))], ["Visitors (total)", sum("visitors")]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border p-3 text-center"><p className="text-2xl font-semibold tabular">{(v as number).toLocaleString()}</p><p className="text-xs text-muted-foreground">{l}</p></div>
          ))}
        </section>
        <p className="text-center text-sm text-muted-foreground">
          Adults: {adults ? Math.round((sum("men") / adults) * 100) : 0}% men, {adults ? Math.round((sum("women") / adults) * 100) : 0}% women
          {t.attendanceRate !== null && ` · attendance rate ${t.attendanceRate}% of ${t.activeMembers} active members (last 4 Sundays)`}
        </p>

        <section>
          <h2 className="mb-2 font-semibold">By service</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="py-2">Service</th><th className="text-right">Sundays held</th><th className="text-right">Average</th><th className="text-right">Highest</th><th className="text-right">Lowest</th></tr></thead>
            <tbody>
              {cols.map((c) => { const v = days.map((d) => svc(d, c)).filter((x): x is number => x !== null); return (
                <tr key={c} className="border-b"><td className="py-1.5">{c}</td><td className="text-right tabular">{v.length}</td><td className="text-right font-semibold tabular">{avg(v)}</td><td className="text-right tabular">{v.length ? Math.max(...v) : "—"}</td><td className="text-right tabular">{v.length ? Math.min(...v) : "—"}</td></tr>
              ) })}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-2 font-semibold">Sunday by Sunday</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 text-left">Sunday</th>{cols.map((c) => <th key={c} className="text-right">{c.replace(" Service", "")}</th>)}
              <th className="text-right">Men</th><th className="text-right">Women</th><th className="text-right">Children</th><th className="text-right">Visitors</th><th className="text-right">Total</th>
            </tr></thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date} className="border-b break-inside-avoid">
                  <td className="py-1.5">{new Date(`${d.date}T00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</td>
                  {cols.map((c) => <td key={c} className="text-right tabular">{svc(d, c) ?? "—"}</td>)}
                  <td className="text-right tabular">{d.men}</td><td className="text-right tabular">{d.women}</td><td className="text-right tabular">{d.children}</td><td className="text-right tabular">{d.visitors}</td>
                  <td className="text-right font-semibold tabular">{d.total}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="font-semibold"><td className="py-2">Average</td>{cols.map((c) => <td key={c} className="text-right tabular">{avg(days.map((d) => svc(d, c)).filter((x): x is number => x !== null))}</td>)}
              {(["men", "women", "children", "visitors", "total"] as const).map((k) => <td key={k} className="text-right tabular">{avg(days.map((d) => d[k]))}</td>)}</tr></tfoot>
          </table>
        </section>

        <section className="break-before-page">
          <SundaySchoolReportView from={from} to={to} print />
        </section>
        <footer className="pt-6 text-center text-xs text-muted-foreground">Printed {longDate(new Date().toISOString().slice(0, 10))}</footer>
      </article>
    </div>
  )
}

export default function AttendanceReportPage() {
  return <Suspense><Report /></Suspense>
}
