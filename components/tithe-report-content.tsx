"use client"

import { useMemo, useState } from "react"
import { Coins, Download, Printer, Search, Users, CalendarCheck, TrendingUp, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, Page, PageHeader, StatCard, TableCard, TableSkeleton } from "@/components/page"
import { qs, useApi } from "@/lib/api"
import { compact, money, today } from "@/lib/format"
import { rangeLabel, usePeriod } from "@/lib/period"
import { PeriodFilter } from "@/components/period-filter"
import { useSettings } from "@/lib/settings"
import type { TitheReport } from "@/lib/types"
import { cn } from "@/lib/utils"

export function TitheReportContent() {
  const period = usePeriod("this_year")
  const [search, setSearch] = useState("")
  const [show, setShow] = useState<"all" | "faithful" | "irregular">("all")
  const settings = useSettings()
  const { data, isLoading, error } = useApi<TitheReport>(qs("/reports/tithes", { from: period.range.from ?? undefined, to: period.range.to ?? today() }))
  const MONTHS = (data?.months ?? []).map((m) => m.label)
  const when = period.preset === "custom" ? rangeLabel(period.range) : period.label

  // Months in the period that have started (for "faithful" = gave every month so far).
  const elapsed = (data?.months ?? []).filter((m) => m.key <= today().slice(0, 7)).length

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.rows ?? []).filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !(r.pledgeNumber ?? "").toLowerCase().includes(q)) return false
      if (show === "faithful") return r.monthsGiven >= elapsed
      if (show === "irregular") return r.monthsGiven < elapsed
      return true
    })
  }, [data, search, show, elapsed])

  const faithful = (data?.rows ?? []).filter((r) => r.monthsGiven >= elapsed).length
  const peak = Math.max(1, ...(data?.rows ?? []).flatMap((r) => r.months))

  const exportCsv = () => {
    if (!data) return
    const esc = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
    const lines = [
      ["Pledge no", "Name", ...MONTHS, "Total"].join(","),
      ...rows.map((r) => [r.pledgeNumber ?? "", r.name, ...r.months, r.total].map(esc).join(",")),
      ["", "Month total", ...data.monthTotals, data.total].map(esc).join(","),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `tithe-report-${data.from}-to-${data.to}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <Page className="max-w-[90rem]">
      <PageHeader
        eyebrow="Stewardship · Reports"
        title="Tithe report"
        description={`${settings.churchName}: who has tithed each month, by pledge number.`}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button onClick={exportCsv} disabled={!data?.rows.length}>
              <Download className="size-4" /> Export CSV
            </Button>
          </div>
        }
      />

      <PeriodFilter period={period} className="print:hidden" />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
        <StatCard label="Tithes received" icon={Coins} tone="gold" value={data && money(data.total)} hint={when} />
        <StatCard label="Tithers" icon={Users} value={data?.tithers.toLocaleString()} hint="Members and visitors who tithed" />
        <StatCard
          label="Faithful every month"
          icon={CalendarCheck}
          tone="success"
          value={data && faithful.toLocaleString()}
          hint={elapsed ? `Gave in all ${elapsed} month${elapsed === 1 ? "" : "s"} so far` : "Period not started"}
        />
        <StatCard
          label="Average per tither"
          icon={TrendingUp}
          tone="info"
          value={data && money(data.tithers ? data.total / data.tithers : 0)}
        />
      </section>

      <TableCard
        title="Tithers"
        count={rows.length}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row print:hidden">
            <div className="relative sm:w-60">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or pledge no…" className="h-9 pl-9" aria-label="Search tithers" />
            </div>
            <Select value={show} onValueChange={(v) => setShow(v as typeof show)}>
              <SelectTrigger size="sm" className="sm:w-44" aria-label="Show">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="faithful">Every month so far</SelectItem>
                <SelectItem value="irregular">Missed a month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        {error && <p className="px-6 pt-4 text-sm text-destructive">{error.message}</p>}
        {isLoading && !data ? (
          <TableSkeleton />
        ) : !rows.length ? (
          <EmptyState icon={FileText} title={data?.rows.length ? "No one matches" : "No tithes recorded in this period"} description="Tithes recorded on the Offertory page show up here." />
        ) : (
          <Table className="text-[13px]">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-card">Tither</TableHead>
                {MONTHS.map((m, i) => (
                  <TableHead key={m} className={cn("px-2 text-right", i >= elapsed && "opacity-50")}>
                    {m}
                  </TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.memberId ?? r.name}>
                  <TableCell className="sticky left-0 z-10 bg-card group-hover/row:bg-[color-mix(in_oklch,var(--card)_60%,var(--accent))]">
                    <p className="font-semibold">{r.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{r.pledgeNumber ?? (r.memberId ? "—" : "Visitor")}</p>
                  </TableCell>
                  {r.months.map((v, i) => (
                    <TableCell key={i} className="px-1.5 text-right">
                      {v ? (
                        <span
                          title={`${MONTHS[i]}: ${money(v)}`}
                          className="inline-block min-w-12 rounded-md px-1.5 py-1 font-medium tabular text-primary print:bg-transparent"
                          style={{ background: `color-mix(in oklch, var(--primary) ${Math.round(8 + (v / peak) * 30)}%, transparent)` }}
                        >
                          {compact(v)}
                        </span>
                      ) : (
                        <span className={cn("text-muted-foreground/40", i < elapsed && "text-destructive/50")}>·</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold tabular">{money(r.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {data && (
              <TableFooter className="bg-primary/5">
                <TableRow className="hover:bg-transparent">
                  <TableCell className="sticky left-0 z-10 bg-[color-mix(in_oklch,var(--card)_95%,var(--primary))] font-semibold text-primary">Month total</TableCell>
                  {data.monthTotals.map((v, i) => (
                    <TableCell key={i} className="px-1.5 text-right font-semibold tabular">
                      {v ? compact(v) : "—"}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold text-primary tabular">{money(data.total)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        )}
      </TableCard>
      <p className="text-xs text-muted-foreground">
        Cells show amounts in short form (e.g. 1.2K); hover for the exact figure. A red dot marks a month that has passed with no tithe.
        The CSV export has the full amounts.
      </p>
    </Page>
  )
}
