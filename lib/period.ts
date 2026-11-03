"use client"

import { useState } from "react"
import { useSettings } from "@/lib/settings"

/** Date periods shared by every list and report. Weeks start on Monday; "year" means the financial year. */
export const PERIOD_PRESETS = [
  { key: "this_week", label: "This week" },
  { key: "last_week", label: "Last week" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "this_year", label: "This year" },
  { key: "last_year", label: "Last year" },
  { key: "custom", label: "Custom…" },
] as const
export type PeriodPreset = (typeof PERIOD_PRESETS)[number]["key"] | "all"
export type Range = { from: string | null; to: string | null }

export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const parse = (s: string) => new Date(`${s}T00:00`)
const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return isoDate(d) }
const addMonths = (s: string, n: number) => {
  const d = parse(s)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
  return isoDate(d)
}

export function rangeFor(preset: PeriodPreset, fyMonth = 1, now = new Date()): Range {
  const today = isoDate(now)
  const monday = addDays(today, -((now.getDay() + 6) % 7))
  const fyYear = now.getMonth() + 1 >= fyMonth ? now.getFullYear() : now.getFullYear() - 1
  const fyStart = isoDate(new Date(fyYear, fyMonth - 1, 1))
  switch (preset) {
    case "this_week": return { from: monday, to: today }
    case "last_week": return { from: addDays(monday, -7), to: addDays(monday, -1) }
    case "this_month": return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: today }
    case "last_month": return { from: isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: isoDate(new Date(now.getFullYear(), now.getMonth(), 0)) }
    case "this_year": return { from: fyStart, to: today }
    case "last_year": return { from: isoDate(new Date(fyYear - 1, fyMonth - 1, 1)), to: addDays(fyStart, -1) }
    default: return { from: null, to: null }
  }
}

/** The comparable earlier period: last week to the same weekday, last month to the same date, and so on. */
export function previousRange(preset: PeriodPreset, r: Range): Range | null {
  if (!r.from || !r.to) return null
  const by = (f: (s: string) => string) => ({ from: f(r.from!), to: f(r.to!) })
  if (preset === "this_week" || preset === "last_week") return by((s) => addDays(s, -7))
  if (preset === "this_month" || preset === "last_month") return by((s) => addMonths(s, -1))
  if (preset === "this_year" || preset === "last_year") return by((s) => addMonths(s, -12))
  const days = Math.round((parse(r.to).getTime() - parse(r.from).getTime()) / 86_400_000) + 1
  return by((s) => addDays(s, -days))
}

const fmtDay = (s: string, withYear: boolean) => parse(s).toLocaleDateString(undefined, { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) })
export function rangeLabel(r: Range) {
  if (!r.from && !r.to) return "All dates"
  if (!r.from) return `Up to ${fmtDay(r.to!, true)}`
  if (!r.to) return `From ${fmtDay(r.from, true)}`
  if (r.from === r.to) return fmtDay(r.from, true)
  return `${fmtDay(r.from, r.from.slice(0, 4) !== r.to.slice(0, 4))} – ${fmtDay(r.to, true)}`
}

export const presetLabel = (p: PeriodPreset) => (p === "all" ? "All time" : PERIOD_PRESETS.find((x) => x.key === p)!.label.replace("…", ""))

export type PeriodState = {
  preset: PeriodPreset
  range: Range
  /** previous comparable period, for "vs last month" style trends */
  previous: Range | null
  label: string
  setPreset: (p: PeriodPreset) => void
  setCustom: (r: Range) => void
}

/** Period state for a page. `initial` "all" shows everything until the user narrows it. */
export function usePeriod(initial: PeriodPreset = "this_month", initialCustom?: Range): PeriodState {
  const { financialYearStartMonth } = useSettings()
  const fy = financialYearStartMonth ?? 1
  const [preset, setPresetState] = useState<PeriodPreset>(initialCustom ? "custom" : initial)
  const [custom, setCustomState] = useState<Range>(() => initialCustom ?? rangeFor(initial === "all" || initial === "custom" ? "this_month" : initial, fy))
  const range = preset === "custom" ? custom : rangeFor(preset, fy)
  return {
    preset,
    range,
    previous: previousRange(preset, range),
    label: preset === "custom" ? rangeLabel(range) : presetLabel(preset),
    setPreset: (p) => {
      if (p === "custom" && preset !== "custom" && preset !== "all") setCustomState(rangeFor(preset, fy))
      setPresetState(p)
    },
    setCustom: (r) => setCustomState(r),
  }
}
