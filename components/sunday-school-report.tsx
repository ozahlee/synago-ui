"use client"

import { Fragment } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { qs, useApi } from "@/lib/api"
import type { SundaySchoolReport } from "@/lib/types"
import { cn } from "@/lib/utils"

const sunday = (d: string) => new Date(`${d}T00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })

/** Boys and girls as one bar, with the share of girls; colour plus labels, never colour alone. */
export function GenderSplit({ boys, girls, className }: { boys: number; girls: number; className?: string }) {
  const t = boys + girls
  if (!t) return <span className="text-xs text-muted-foreground">—</span>
  const b = Math.round((boys / t) * 100)
  return (
    <div className={cn("min-w-28", className)} title={`${boys} boys (${b}%) · ${girls} girls (${100 - b}%)`}>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <span className="h-full bg-[var(--chart-1)]" style={{ width: `${b}%` }} />
        <span className="h-full border-l-2 border-card bg-[var(--chart-2)]" style={{ width: `${100 - b}%` }} />
      </div>
      <p className="mt-0.5 flex justify-between text-[11px] text-muted-foreground tabular"><span>{b}% boys</span><span>{100 - b}% girls</span></p>
    </div>
  )
}

/**
 * Sunday school for a period: each class by service with boys / girls, the gender split, sessions and
 * average; then every Sunday class by class. `print` drops the buttons and keeps everything open.
 */
export function SundaySchoolReportView({ from, to, print }: { from: string | null; to: string | null; print?: boolean }) {
  const { data: r } = useApi<SundaySchoolReport>(qs("/sunday-school/report", { from: from ?? undefined, to: to ?? undefined }))
  if (!r) return <div className="h-48 animate-pulse rounded-2xl bg-muted" />
  const csv = () => {
    const rows = r.sundays.flatMap((s) => s.rows.map((x) => [s.date, x.class, x.service, x.boys, x.girls, x.visitors, x.total].join(",")))
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([["Date,Class,Service,Boys,Girls,Not on roll,Total", ...rows].join("\n")], { type: "text/csv" }))
    a.download = `sunday-school-${r.from}-to-${r.to ?? "today"}.csv`
    a.click()
  }
  const empty = r.totals.sessions === 0
  return (
    <div className="space-y-4">
      <Card className={cn("gap-0 overflow-hidden py-0", print && "shadow-none")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Sunday school by class</h2>
            <p className="text-sm text-muted-foreground">
              {empty ? "Nothing recorded in this period." : `${r.totals.total.toLocaleString()} attendances: ${r.totals.boys} boys, ${r.totals.girls} girls${r.totals.visitors ? ` (${r.totals.visitors} not on the roll)` : ""}`}
            </p>
          </div>
          {!print && !empty && <Button variant="outline" size="sm" onClick={csv}><Download className="size-4" /> CSV</Button>}
        </div>
        {!empty && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="px-6 py-3 text-left">Class</th><th className="px-3 py-3 text-left">Service</th>
                  <th className="px-3 py-3 text-right">Sundays</th><th className="px-3 py-3 text-right">Boys</th><th className="px-3 py-3 text-right">Girls</th>
                  <th className="hidden px-3 py-3 text-left sm:table-cell">Split</th><th className="px-3 py-3 text-right">Total</th><th className="px-6 py-3 text-right">Average</th>
                </tr>
              </thead>
              <tbody>
                {r.byClass.filter((c) => c.sessions > 0).map((c) => (
                  <Fragment key={c.id}>
                    {c.byService.map((s, i) => (
                      <tr key={s.service} className={cn("border-b border-border/60", i === 0 && "border-t")}>
                        <td className="px-6 py-2">{i === 0 && <><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">Ages {c.ages}</p></>}</td>
                        <td className="px-3 py-2">{s.service}{s.service === c.service && <span className="ml-1 text-[11px] text-muted-foreground">(usual)</span>}</td>
                        <td className="px-3 py-2 text-right tabular">{s.sessions}</td>
                        <td className="px-3 py-2 text-right tabular">{s.boys}</td>
                        <td className="px-3 py-2 text-right tabular">{s.girls}</td>
                        <td className="hidden px-3 py-2 sm:table-cell"><GenderSplit boys={s.boys} girls={s.girls} /></td>
                        <td className="px-3 py-2 text-right tabular">{s.total}</td>
                        <td className="px-6 py-2 text-right tabular">{s.average}</td>
                      </tr>
                    ))}
                    {c.byService.length > 1 && (
                      <tr className="border-b bg-secondary/40 text-xs">
                        <td className="px-6 py-1.5" /><td className="px-3 py-1.5 font-semibold">All services</td>
                        <td className="px-3 py-1.5 text-right tabular">{c.sessions}</td><td className="px-3 py-1.5 text-right tabular">{c.boys}</td><td className="px-3 py-1.5 text-right tabular">{c.girls}</td>
                        <td className="hidden px-3 py-1.5 sm:table-cell"><GenderSplit boys={c.boys} girls={c.girls} /></td>
                        <td className="px-3 py-1.5 text-right font-semibold tabular">{c.total}</td><td className="px-6 py-1.5 text-right tabular">{c.average}</td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                {r.byService.map((s) => (
                  <tr key={s.service} className="bg-primary/5 text-sm">
                    <td className="px-6 py-2 font-semibold text-primary">All classes</td><td className="px-3 py-2 font-medium">{s.service}</td>
                    <td className="px-3 py-2 text-right tabular">{s.sessions}</td><td className="px-3 py-2 text-right font-semibold tabular">{s.boys}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular">{s.girls}</td>
                    <td className="hidden px-3 py-2 sm:table-cell"><GenderSplit boys={s.boys} girls={s.girls} /></td>
                    <td className="px-3 py-2 text-right font-semibold tabular">{s.total}</td><td className="px-6 py-2 text-right tabular">{s.average}</td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {!empty && (
        <Card className={cn("gap-0 overflow-hidden py-0", print && "shadow-none")}>
          <div className="border-b px-6 py-4"><h2 className="text-lg font-semibold">Sunday school, Sunday by Sunday</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="px-6 py-3 text-left">Sunday</th><th className="px-3 py-3 text-left">Class · service</th>
                  <th className="px-3 py-3 text-right">Boys</th><th className="px-3 py-3 text-right">Girls</th><th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {r.sundays.map((s) => (
                  <Fragment key={s.date}>
                    {s.rows.map((x, i) => (
                      <tr key={`${x.classId}-${x.service}`} className={cn("border-b border-border/60", i === 0 && "border-t")}>
                        <td className="px-6 py-1.5 font-medium">{i === 0 ? sunday(s.date) : ""}</td>
                        <td className="px-3 py-1.5">{x.class} <span className="text-muted-foreground">· {x.service}</span>{x.visitors ? <span className="ml-1 text-[11px] text-muted-foreground">({x.visitors} not on roll)</span> : null}</td>
                        <td className="px-3 py-1.5 text-right tabular">{x.boys}</td><td className="px-3 py-1.5 text-right tabular">{x.girls}</td><td className="px-6 py-1.5 text-right tabular">{x.total}</td>
                      </tr>
                    ))}
                    <tr className="border-b bg-secondary/40 text-xs font-semibold">
                      <td className="px-6 py-1.5" /><td className="px-3 py-1.5">Day total</td>
                      <td className="px-3 py-1.5 text-right tabular">{s.boys}</td><td className="px-3 py-1.5 text-right tabular">{s.girls}</td><td className="px-6 py-1.5 text-right tabular">{s.total}</td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
