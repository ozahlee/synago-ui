"use client"

import { useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/page"
import { qs, useApi } from "@/lib/api"
import { longDate, money, titleCase, today } from "@/lib/format"
import { OFFERTORY_CATEGORIES, type OffertoryDay, type OffertoryDaySummary } from "@/lib/types"
import { cn } from "@/lib/utils"

/** The most recent Sunday on or before today, as YYYY-MM-DD. */
function lastSunday() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function shift(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y, m - 1, d + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

/** One day's offerings per service (First, Second…) with the combined total for the day. */
export function SundayBreakdown() {
  const [day, setDay] = useState(lastSunday())
  const { data, isLoading } = useApi<OffertoryDay>(qs("/offertory/day", { date: day }))
  const { data: recent = [] } = useApi<OffertoryDaySummary[]>("/offertory/days?limit=6")
  const services = data?.services ?? []
  const best = services.reduce((m, s) => Math.max(m, s.total), 0)

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Service collections</h2>
          <p className="text-sm text-muted-foreground">Each service counted separately, then added up for the day</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" aria-label="Previous week" onClick={() => setDay(shift(day, -7))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            type="date"
            value={day}
            max={today()}
            onChange={(e) => e.target.value && setDay(e.target.value)}
            className="h-9 w-40"
            aria-label="Day"
          />
          <Button variant="outline" size="icon-sm" aria-label="Next week" disabled={shift(day, 7) > today()} onClick={() => setDay(shift(day, 7))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_17rem]">
        <div className="min-w-0">
          {isLoading && !data ? (
            <div className="m-6 h-40 animate-pulse rounded-xl bg-muted" />
          ) : !data || data.count === 0 ? (
            <EmptyState icon={CalendarDays} title={`Nothing recorded for ${longDate(day)}`} description="Pick another day, or record offerings against a service." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  {OFFERTORY_CATEGORIES.map((c) => (
                    <TableHead key={c} className="hidden text-right sm:table-cell">
                      {titleCase(c)}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.service ?? "none"}>
                    <TableCell>
                      <p className="font-semibold">{s.service ?? "Not service-specific"}</p>
                      <div className="mt-1.5 h-1 w-28 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${best ? (s.total / best) * 100 : 0}%` }} />
                      </div>
                    </TableCell>
                    {OFFERTORY_CATEGORIES.map((c) => (
                      <TableCell key={c} className={cn("hidden text-right tabular sm:table-cell", !s.byCategory[c] && "text-muted-foreground/50")}>
                        {s.byCategory[c] ? money(s.byCategory[c]) : "—"}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-semibold tabular">{money(s.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-primary/5">
                <TableRow className="hover:bg-transparent">
                  <TableCell>
                    <p className="font-semibold text-primary">Total for {longDate(day)}</p>
                    <p className="text-xs text-muted-foreground">
                      {data.count} gifts across {services.filter((s) => s.count).length}{" "}
                      {services.filter((s) => s.count).length === 1 ? "service" : "services"}
                    </p>
                  </TableCell>
                  {OFFERTORY_CATEGORIES.map((c) => (
                    <TableCell key={c} className="hidden text-right font-semibold tabular sm:table-cell">
                      {money(data.byCategory[c])}
                    </TableCell>
                  ))}
                  <TableCell className="text-right text-lg font-bold text-primary tabular">{money(data.total)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </div>

        <aside className="border-t bg-secondary/30 p-4 lg:border-l lg:border-t-0">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Recent days</p>
          <ul className="space-y-1">
            {recent.map((r) => (
              <li key={r.date}>
                <button
                  onClick={() => setDay(r.date)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-card",
                    r.date === day && "bg-card shadow-soft",
                  )}
                >
                  <span>
                    <span className="block font-medium">{longDate(r.date).replace(/,?\s\d{4}$/, "")}</span>
                    <span className="block text-xs text-muted-foreground">
                      {r.services.length} {r.services.length === 1 ? "service" : "services"}
                    </span>
                  </span>
                  <span className="font-semibold tabular">{money(r.total)}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </Card>
  )
}
