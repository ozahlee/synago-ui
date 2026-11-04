"use client"

import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { photoSrc } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { initials } from "@/lib/format"

/** Standard page wrapper: consistent gutters and max width. */
export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 md:px-10 md:pb-10 md:pt-6", className)}>{children}</div>
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-foreground dark:text-gold">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold text-balance md:text-4xl">{title}</h1>
        {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

const TONES = {
  primary: "bg-primary/10 text-primary",
  gold: "bg-gold/15 text-gold-foreground dark:text-gold",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
} as const
export type Tone = keyof typeof TONES

/** KPI tile. `trend` is a percentage change (positive = up). */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  tone = "primary",
  valueClassName,
}: {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  hint?: React.ReactNode
  trend?: number | null
  tone?: Tone
  valueClassName?: string
}) {
  return (
    <Card className="gap-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", TONES[tone])}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <div className={cn("mt-2 text-2xl font-semibold tracking-tight tabular md:text-[1.7rem]", valueClassName)}>
        {value ?? <span className="inline-block h-7 w-24 animate-pulse rounded-md bg-muted align-middle" />}
      </div>
      {(hint || trend != null) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {trend != null && <Trend value={trend} />}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </Card>
  )
}

export function Trend({ value }: { value: number }) {
  const up = value >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold tabular",
        up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="size-3" />
      {Math.abs(value).toFixed(Number.isInteger(value) ? 0 : 1)}%
    </span>
  )
}

/** Card that holds a full-bleed table: title row, optional toolbar, table, footer. */
export function TableCard({
  title,
  count,
  actions,
  footer,
  children,
}: {
  title: string
  count?: number
  actions?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-semibold">{title}</h2>
          {count != null && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground tabular">
              {count.toLocaleString()}
            </span>
          )}
        </div>
        {actions}
      </div>
      {children}
      {footer && <div className="border-t bg-secondary/40 px-6 py-3">{footer}</div>}
    </Card>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <div className="size-9 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/5 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="font-display text-lg font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

const AVATAR_TINTS = [
  "bg-chart-1/15 text-chart-1",
  "bg-gold/20 text-gold-foreground dark:text-gold",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/20 text-[color-mix(in_oklch,var(--chart-4)_60%,black)] dark:text-chart-4",
  "bg-chart-5/15 text-chart-5",
]

/** Avatar with a stable colour picked from the person's name. */
export function PersonAvatar({ name, className, photoUrl }: { name: string; className?: string; photoUrl?: string | null }) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const src = photoSrc(photoUrl)
  return (
    <Avatar className={cn("size-9", className)}>
      {src && <AvatarImage src={src} alt={name} className="object-cover object-top" />}
      <AvatarFallback className={cn("font-semibold", AVATAR_TINTS[h % AVATAR_TINTS.length])}>{initials(name) || "?"}</AvatarFallback>
    </Avatar>
  )
}

export function StatusBadge({ status }: { status: "active" | "inactive" | "deceased" | string }) {
  if (status === "deceased")
    return (
      <Badge className="gap-1.5 border-transparent bg-foreground text-background">
        <span aria-hidden>✝</span> Deceased
      </Badge>
    )
  return (
    <Badge variant={status === "active" ? "success" : "muted"} className="gap-1.5 capitalize">
      <span className={`size-1.5 rounded-full ${status === "active" ? "bg-success" : "bg-muted-foreground/60"}`} />
      {status}
    </Badge>
  )
}
