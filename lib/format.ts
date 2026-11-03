export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "UGX"
export const CHURCH_NAME = process.env.NEXT_PUBLIC_CHURCH_NAME ?? "SJW"

const moneyFmt = new Intl.NumberFormat(undefined, { style: "currency", currency: CURRENCY, maximumFractionDigits: 2 })
const compactFmt = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 })

export const money = (n: number | null | undefined) => moneyFmt.format(n ?? 0)
export const compact = (n: number) => compactFmt.format(n)

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join("")

/** "2026-11-02" → localized date, parsed as a calendar date (no timezone shift). */
export function date(value: string | null | undefined) {
  if (!value) return "—"
  const [y, m, d] = value.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString()
}

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export const currentPeriod = () => today().slice(0, 7)

/** "+5.2%" / "-3.1%" for a change between two values; null when there's no baseline. */
export function pctChange(prev: number, curr: number): string | null {
  if (!prev) return null
  const p = ((curr - prev) / prev) * 100
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`
}

export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const parseDay = (value: string) => {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** Whole years between a date and today (age, years in fellowship). */
export function yearsSince(value: string | null | undefined): number | null {
  if (!value) return null
  const from = parseDay(value)
  const now = new Date()
  let years = now.getFullYear() - from.getFullYear()
  if (now.getMonth() < from.getMonth() || (now.getMonth() === from.getMonth() && now.getDate() < from.getDate())) years--
  return Math.max(years, 0)
}

/** "Joined 3 years ago" style phrase. */
export function tenure(value: string | null | undefined): string {
  const y = yearsSince(value)
  if (y === null) return "—"
  if (y === 0) return "Less than a year"
  return `${y} year${y === 1 ? "" : "s"}`
}

/** Days until the next birthday (0 = today), or null if unknown. */
export function daysToBirthday(value: string | null | undefined): number | null {
  if (!value) return null
  const dob = parseDay(value)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
  if (next < today) next = new Date(now.getFullYear() + 1, dob.getMonth(), dob.getDate())
  return Math.round((next.getTime() - today.getTime()) / 86_400_000)
}

/** Long readable date: "12 March 2021". */
export function longDate(value: string | null | undefined) {
  if (!value) return "—"
  return parseDay(value).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
}

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/** The most recent Sunday on or before today (YYYY-MM-DD). */
export function lastSunday() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return isoDay(d)
}

/** Add days to a YYYY-MM-DD date. */
export function shiftDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number)
  return isoDay(new Date(y, m - 1, d + days))
}

/** "In 3 days" / "Today" / "5 days ago" for a YYYY-MM-DD date. */
export function relativeDay(iso: string) {
  const diff = Math.round((parseDay(iso).getTime() - parseDay(today()).getTime()) / 86_400_000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff === -1) return "Yesterday"
  return diff > 0 ? `In ${diff} days` : `${-diff} days ago`
}

export const humanize = (s: string) => titleCase(s.replace(/_/g, " "))
