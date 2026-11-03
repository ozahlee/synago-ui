"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { AlertCircle, AlertTriangle, BellOff, Check, CheckCircle2, ChevronDown, ChevronRight, Info, MoreHorizontal, RotateCcw, UserRound, UserRoundX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { del, post, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { AttentionItem } from "@/lib/types"
import { cn } from "@/lib/utils"

const SEVERITY = {
  danger: { icon: AlertCircle, text: "text-destructive", badge: "bg-destructive/10 text-destructive", label: "Urgent" },
  warning: { icon: AlertTriangle, text: "text-warning", badge: "bg-warning/15 text-[color-mix(in_oklch,var(--warning)_70%,black)] dark:text-warning", label: "Soon" },
  info: { icon: Info, text: "text-info", badge: "bg-info/10 text-info", label: "To do" },
} as const
const AREA = { care: "Pastoral", registers: "Registers", money: "Money", admin: "Admin" } as const
const BUCKETS = [
  { key: "today", label: "Today", hint: "Overdue or urgent" },
  { key: "week", label: "This week", hint: "Due in the next 7 days" },
  { key: "later", label: "Can wait", hint: "No deadline" },
] as const

/** The office's to-do queue: what is due today first, then this week, then whatever can wait. */
export function AttentionQueue({ focus }: { focus?: { label: string; match: (i: AttentionItem) => boolean } }) {
  const { data: all, mutate } = useApi<AttentionItem[]>("/dashboard/attention", { refreshInterval: 5 * 60_000 })
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [showHidden, setShowHidden] = useState(false)
  const [everything, setEverything] = useState(false)
  // a role view shows its own items first; the rest are one click away
  const data = all && focus && !everything ? all.filter(focus.match) : all
  const others = all && focus && !everything ? all.filter((i) => !i.hidden && !focus.match(i)).length : 0
  const visible = data?.filter((i) => !i.hidden) ?? []
  const hidden = data?.filter((i) => i.hidden) ?? []
  // Today is open; if nothing is due today, open the first group that has something.
  const firstOpen = BUCKETS.find((b) => visible.some((i) => i.bucket === b.key))?.key
  const isOpen = (k: string) => open[k] ?? (k === "today" || k === firstOpen)

  const act = async (fn: () => Promise<AttentionItem[]>, msg: string, undo?: () => Promise<AttentionItem[]>) => {
    try {
      mutate({ data: await fn() }, false)
      toast.success(msg, undo ? { action: { label: "Undo", onClick: async () => mutate({ data: await undo() }, false) } } : undefined)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong") }
  }
  const api = {
    snooze: (i: AttentionItem, days: number) => act(() => post<{ data: AttentionItem[] }>(`/dashboard/attention/${i.key}/snooze`, { days }).then((r) => r.data),
      `Snoozed until ${days === 1 ? "tomorrow" : days === 3 ? "in 3 days" : "next week"}`, () => del(`/dashboard/attention/${i.key}/state`).then(() => reload())),
    done: (i: AttentionItem) => act(() => post<{ data: AttentionItem[] }>(`/dashboard/attention/${i.key}/done`).then((r) => r.data),
      "Marked done. It comes back if anything changes", () => del(`/dashboard/attention/${i.key}/state`).then(() => reload())),
    restore: (i: AttentionItem) => act(() => del(`/dashboard/attention/${i.key}/state`).then(() => reload()), "Back in the list"),
    assign: (i: AttentionItem, userId: string | null, name?: string) => act(() => post<{ data: AttentionItem[] }>(`/dashboard/attention/${i.key}/assign`, { userId: userId ? Number(userId) : null }).then((r) => r.data),
      userId ? `Assigned to ${name}` : "Unassigned"),
  }
  const reload = async () => (await mutate())?.data ?? []

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Needs attention</h2>
          <p className="text-xs text-muted-foreground">
            {focus && !everything ? <>{focus.label}, most urgent first{others > 0 ? " · " : ". "}</> : "Most urgent first. "}
            {others > 0 ? <button type="button" className="text-primary hover:underline" onClick={() => setEverything(true)}>+{others} other{others === 1 ? "" : "s"}</button>
              : focus && everything ? <button type="button" className="text-primary hover:underline" onClick={() => setEverything(false)}>Back to {focus.label.toLowerCase()}</button>
              : "Snooze, finish or hand on without leaving the page"}
          </p>
        </div>
        {visible.length > 0 && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold tabular text-primary">{visible.length}</span>}
      </div>
      {!data ? (
        <div className="space-y-3 p-5">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <CheckCircle2 className="size-10 text-success" />
          <p className="font-semibold">All clear</p>
          <p className="max-w-xs text-sm text-muted-foreground">Nothing is waiting on you right now. Visitors, follow-ups, Sunday records and money checks show up here when they need someone.</p>
        </div>
      ) : (
        <div className="divide-y">
          {BUCKETS.map((b) => {
            const rows = visible.filter((i) => i.bucket === b.key)
            if (!rows.length) return null
            const expanded = isOpen(b.key)
            return (
              <section key={b.key}>
                <button type="button" onClick={() => setOpen({ ...open, [b.key]: !expanded })} aria-expanded={expanded}
                  className="flex w-full items-center gap-2 bg-muted/40 px-5 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/70">
                  {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  <span className={b.key === "today" ? "text-foreground" : ""}>{b.label}</span>
                  <span className="rounded-full bg-background px-1.5 tabular">{rows.length}</span>
                  <span className="ml-auto font-normal normal-case tracking-normal">{b.hint}</span>
                </button>
                {expanded && <ul className="divide-y">{rows.map((i) => <Row key={i.key} item={i} api={api} />)}</ul>}
              </section>
            )
          })}
        </div>
      )}
      {hidden.length > 0 && (
        <div className="border-t px-5 py-2.5 text-xs text-muted-foreground">
          <button type="button" className="hover:text-foreground hover:underline" onClick={() => setShowHidden(!showHidden)}>
            {[hidden.filter((i) => i.hidden === "snoozed").length && `${hidden.filter((i) => i.hidden === "snoozed").length} snoozed`, hidden.filter((i) => i.hidden === "done").length && `${hidden.filter((i) => i.hidden === "done").length} done`].filter(Boolean).join(" · ")}
            {" · "}{showHidden ? "hide" : "show"}
          </button>
          {showHidden && (
            <ul className="mt-2 space-y-1.5">
              {hidden.map((i) => (
                <li key={i.key} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">{i.title}{i.hidden === "snoozed" && i.snoozedUntil ? ` · until ${new Date(`${i.snoozedUntil}T00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}` : " · done"}</span>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => api.restore(i)}><RotateCcw className="size-3" /> Bring back</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}

type Api = {
  snooze: (i: AttentionItem, days: number) => void
  done: (i: AttentionItem) => void
  restore: (i: AttentionItem) => void
  assign: (i: AttentionItem, userId: string | null, name?: string) => void
}

function Row({ item, api }: { item: AttentionItem; api: Api }) {
  const s = SEVERITY[item.severity]
  const { user } = useAuth()
  const [menu, setMenu] = useState(false)
  const from = item.assignedTo?.by && item.assignedTo.by !== user?.name ? ` · from ${item.assignedTo.by.split(" ")[0]}` : ""
  const due = item.due && item.bucket !== "today" ? new Date(`${item.due}T00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : null
  return (
    <li className="group flex items-center gap-1 pr-2 transition hover:bg-muted/50">
      <Link href={item.href} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-5">
        <s.icon className={cn("size-5 shrink-0", s.text)} aria-label={s.label} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
            {item.title}
            <span className="text-[11px] font-normal uppercase tracking-wider text-muted-foreground">{AREA[item.area]}</span>
            {item.why && <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[11px] font-medium text-gold-foreground dark:text-gold">Unusual</span>}
            {item.assignedTo && (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium", item.assignedTo.me ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                <UserRound className="size-3" />{item.assignedTo.me ? `Yours${from}` : item.assignedTo.name.split(" ")[0]}
              </span>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground" title={item.detail ?? undefined}>{[due && `Due ${due}`, item.detail].filter(Boolean).join(" · ")}</p>
          {item.why && <p className="line-clamp-2 text-[11px] italic text-muted-foreground"><span className="not-italic font-medium">Why flagged:</span> {item.why}</p>}
        </div>
        <span className={cn("min-w-7 rounded-full px-2 py-0.5 text-center text-sm font-semibold tabular", s.badge)}>{item.count}</span>
      </Link>
      <DropdownMenu open={menu} onOpenChange={setMenu}>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100 data-[state=open]:opacity-100" aria-label={`Actions for ${item.title}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => api.done(item)}><Check className="size-4" /> Mark done</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger><BellOff className="size-4" /> Snooze</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => api.snooze(item, 1)}>Until tomorrow</DropdownMenuItem>
              <DropdownMenuItem onClick={() => api.snooze(item, 3)}>For 3 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => api.snooze(item, 7)}>For a week</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger><UserRound className="size-4" /> Assign to</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 w-52 overflow-y-auto">
              {menu && <Assignees item={item} api={api} />}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {item.assignedTo && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => api.assign(item, null)}><UserRoundX className="size-4" /> Unassign {item.assignedTo.name.split(" ")[0]}</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

/** Only staff who could act on it (they hold the permission it needs). */
function Assignees({ item, api }: { item: AttentionItem; api: Api }) {
  const { data } = useApi<Array<{ id: string; name: string; me: boolean }>>(`/dashboard/assignees${item.perm ? `?permission=${item.perm}` : ""}`)
  if (!data) return <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Loading…</DropdownMenuLabel>
  return (
    <>
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">People who can act on this</DropdownMenuLabel>
      {data.map((u) => (
        <DropdownMenuItem key={u.id} disabled={item.assignedTo?.id === u.id} onClick={() => api.assign(item, u.id, u.name)}>
          {u.name}{u.me ? " (me)" : ""}{item.assignedTo?.id === u.id && <Check className="ml-auto size-4" />}
        </DropdownMenuItem>
      ))}
    </>
  )
}
