import type { CalendarItem, CalendarKind, LiturgicalColour } from "@/lib/types"

/** Liturgical colours as swatches (fixed, so they read the same in light and dark). */
export const LITURGICAL: Record<LiturgicalColour, { bg: string; label: string }> = {
  white: { bg: "#E9E3D3", label: "White" },
  gold: { bg: "#C9A227", label: "Gold" },
  red: { bg: "#B3261E", label: "Red" },
  purple: { bg: "#6B3FA0", label: "Purple" },
  rose: { bg: "#E39AB3", label: "Rose" },
  green: { bg: "#3F7D4E", label: "Green" },
  black: { bg: "#2A2A2A", label: "Black" },
  blue: { bg: "#3B6EA8", label: "Blue" },
}

export const KIND_META: Record<CalendarKind, { label: string; chip: string; dot: string }> = {
  event: { label: "Church events", chip: "bg-primary/12 text-primary border-primary/20", dot: "bg-primary" },
  sermon: { label: "Preaching", chip: "bg-chart-2/15 text-gold-foreground border-chart-2/30 dark:text-gold", dot: "bg-chart-2" },
  service: { label: "Sunday services", chip: "bg-primary/6 text-foreground border-primary/15", dot: "bg-primary/50" },
  meeting: { label: "Cell & ministry meetings", chip: "bg-info/10 text-info border-info/20", dot: "bg-info" },
  activity: { label: "Ministry activities", chip: "bg-info/10 text-info border-info/20", dot: "bg-info" },
  announcement: { label: "Announcements", chip: "bg-muted text-foreground border-border", dot: "bg-muted-foreground" },
  burial: { label: "Burials", chip: "bg-foreground text-background border-foreground", dot: "bg-foreground" },
  wedding: { label: "Weddings", chip: "bg-gold/20 text-gold-foreground border-gold/40 dark:text-gold", dot: "bg-gold" },
  sacrament: { label: "Baptisms & confirmations", chip: "bg-chart-3/15 text-chart-3 border-chart-3/25", dot: "bg-chart-3" },
  birthday: { label: "Birthdays", chip: "bg-gold/10 text-gold-foreground border-gold/25 dark:text-gold", dot: "bg-gold/70" },
  pledge: { label: "Pledges due", chip: "bg-warning/12 text-warning border-warning/25", dot: "bg-warning" },
  care: { label: "Pastoral follow-ups", chip: "bg-destructive/8 text-destructive border-destructive/20", dot: "bg-destructive/70" },
  outreach: { label: "Outreach", chip: "bg-success/10 text-success border-success/20", dot: "bg-success" },
}

export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
export const parseIsoDay = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}
export const timeOf = (i: CalendarItem) =>
  i.allDay ? null : new Date(`${i.start}:00`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })

/** Where a calendar item lives in the app. */
export function hrefFor(i: CalendarItem): string | null {
  const l = i.link
  if (!l) return null
  switch (l.type) {
    case "member": return `/members?q=${encodeURIComponent(i.title)}`
    case "cellGroup": return `/cell-groups?open=${l.id}`
    case "ministry": return `/ministries?open=${l.id}`
    case "announcement": return `/announcements`
    case "baptism": return `/baptisms?tab=${l.tab ?? "scheduled"}`
    case "marriage": return `/marriages?tab=${l.tab ?? "scheduled"}`
    case "pledge": return `/pledges`
    case "care": return `/care`
    case "outreach": return `/outreach`
    case "sermon": return `/sermons?open=${l.id}`
    default: return null
  }
}

export const REMIND_OPTIONS = [
  { minutes: 10080, label: "1 week before" },
  { minutes: 4320, label: "3 days before" },
  { minutes: 1440, label: "1 day before" },
  { minutes: 180, label: "3 hours before" },
  { minutes: 60, label: "1 hour before" },
]
