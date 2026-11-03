"use client"

import { CalendarRange } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PERIOD_PRESETS, rangeLabel, type PeriodPreset, type PeriodState } from "@/lib/period"
import { today } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * One period picker for every list and report: this/last week, month, year, or custom dates.
 * `asOf` mode (balance sheet, trial balance) uses the end of the chosen period as the "as at" date.
 */
export function PeriodFilter({ period, allowAll, asOf, className, label }: { period: PeriodState; allowAll?: boolean; asOf?: boolean; className?: string; label?: string }) {
  const { preset, range } = period
  const end = asOfDate(period)
  return (
    <div className={cn("flex flex-wrap items-end gap-2", className)}>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{label ?? (asOf ? "As at end of" : "Period")}</Label>
        <Select value={preset} onValueChange={(v) => period.setPreset(v as PeriodPreset)}>
          <SelectTrigger className="w-44" aria-label={asOf ? "As at" : "Period"}><CalendarRange className="size-4 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>
            {allowAll && <><SelectItem value="all">All time</SelectItem><SelectSeparator /></>}
            {PERIOD_PRESETS.map((p) => <SelectItem key={p.key} value={p.key}>{asOf && p.key === "custom" ? "Pick a date…" : p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {preset === "custom" ? (
        asOf ? (
          <div className="space-y-1.5"><Label htmlFor="pf-asof" className="text-xs text-muted-foreground">Date</Label>
            <Input id="pf-asof" type="date" className="w-40" max={today()} value={range.to ?? today()} onChange={(e) => e.target.value && period.setCustom({ from: range.from, to: e.target.value })} /></div>
        ) : (
          <>
            <div className="space-y-1.5"><Label htmlFor="pf-from" className="text-xs text-muted-foreground">From</Label>
              <Input id="pf-from" type="date" className="w-40" value={range.from ?? ""} max={range.to ?? undefined} onChange={(e) => period.setCustom({ from: e.target.value || null, to: range.to })} /></div>
            <div className="space-y-1.5"><Label htmlFor="pf-to" className="text-xs text-muted-foreground">To</Label>
              <Input id="pf-to" type="date" className="w-40" value={range.to ?? ""} min={range.from ?? undefined} onChange={(e) => period.setCustom({ from: range.from, to: e.target.value || null })} /></div>
          </>
        )
      ) : (
        preset !== "all" && <p className="pb-2 text-sm text-muted-foreground tabular">{asOf ? end && rangeLabel({ from: end, to: end }) : rangeLabel(range)}</p>
      )}
    </div>
  )
}

/** "As at" date for balance-type reports: the end of the period, never in the future. */
export function asOfDate(period: PeriodState) {
  const t = today()
  const end = period.range.to ?? t
  return end > t ? t : end
}

/** Query-string fragment for list endpoints. */
export const periodParams = (period: PeriodState) => ({ from: period.range.from, to: period.range.to })
