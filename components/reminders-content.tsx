"use client"

import { useState } from "react"
import Link from "next/link"
import { mutate } from "swr"
import { toast } from "sonner"
import { BellRing, Plus, Play, MessageSquareText, Bell, Moon, Wallet, Clock, X, Cake, Church, UsersRound, Handshake, Footprints, CalendarRange, CheckCircle2, AlertTriangle, Ban, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState, Page, PageHeader, StatCard } from "@/components/page"
import { Pager } from "@/components/pager"
import { FieldError, runAction, str, useApiForm } from "@/components/form"
import { api, patch, post, qs, useApi, type Paginated } from "@/lib/api"
import useSWR from "swr"
import { useAuth } from "@/lib/auth"
import { useSettings } from "@/lib/settings"
import type { CellGroupIndex, Ministry, Reminder, ReminderAudience, ReminderRule, ReminderStats } from "@/lib/types"
import { cn } from "@/lib/utils"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/reminder") || k.startsWith("/notifications")))
const RULE_ICON: Record<string, typeof Bell> = { service_eve: Church, birthdays: Cake, group_meetings: UsersRound, pledge_due: Handshake, follow_ups: Footprints, week_ahead: CalendarRange }
const CHANNEL = { sms: "SMS", app: "App", both: "SMS + app" } as const
const STATUS = {
  pending: { label: "Waiting", variant: "info", icon: Clock },
  sent: { label: "Sent", variant: "success", icon: CheckCircle2 },
  skipped: { label: "Skipped", variant: "warning", icon: AlertTriangle },
  cancelled: { label: "Cancelled", variant: "muted", icon: Ban },
} as const

type ReminderList = Paginated<Reminder> & { stats: ReminderStats }

const when = (s: string) => new Date(s).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })

export function RemindersContent() {
  const { can } = useAuth()
  const manage = can("sms.send")
  const [tab, setTab] = useState<"pending" | "history">("pending")
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const key = qs("/reminders", { status: tab === "pending" ? "pending" : "done", page, perPage: 15 })
  const { data, isLoading } = useSWR<ReminderList>(key, (p: string) => api<ReminderList>(p), { keepPreviousData: true })
  const { data: rules } = useApi<ReminderRule[]>(manage ? "/reminder-rules" : null)
  const stats = data?.stats
  const rows = data?.data ?? []

  const runNow = async () => {
    try {
      const r = await post<{ data: { created: number; sent: number; skipped: number; postponed: number } }>("/reminders/run")
      toast.success(`Checked: ${r.data.created} scheduled, ${r.data.sent} sent, ${r.data.postponed} held for quiet hours, ${r.data.skipped} skipped`)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't run")
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Office"
        title="Reminders"
        description="Automatic reminders by SMS and in the app, to members, staff, a ministry, a cell or church leaders. Nothing goes out during quiet hours or beyond the monthly SMS budget."
        actions={
          <>
            {manage && <Button variant="outline" onClick={runNow}><Play className="size-4" /> Run now</Button>}
            <Button onClick={() => setCreating(true)}><Plus className="size-4" /> {manage ? "New reminder" : "Remind me"}</Button>
          </>
        }
      />

      {manage && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Waiting to go out" icon={Clock} value={stats?.pending.toLocaleString()} />
          <StatCard label="SMS this month" icon={Wallet} tone={stats?.smsBudget && stats.smsUsedThisMonth / stats.smsBudget > 0.85 ? "danger" : "gold"}
            value={stats && `${stats.smsUsedThisMonth.toLocaleString()}${stats.smsBudget ? ` / ${stats.smsBudget.toLocaleString()}` : ""}`}
            hint={stats?.smsBudget ? "Budget set in Church settings" : "No monthly limit set"} />
          <StatCard label="Quiet hours" icon={Moon} tone="info" value={stats && `${stats.quietHours[0]}–${stats.quietHours[1]}`} hint="SMS waits until morning" valueClassName="text-xl md:text-2xl" />
          <StatCard label="Last check" icon={BellRing} tone={stats?.lastRun ? "success" : "danger"} valueClassName="text-xl md:text-2xl"
            value={stats && (stats.lastRun ? new Date(stats.lastRun).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "Never")}
            hint={stats && (stats.lastRun ? new Date(stats.lastRun).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" }) : "Scheduler not running yet")} />
        </section>
      )}

      {manage && stats && !stats.lastRun && (
        <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            Automatic reminders need the server&apos;s scheduler. On the server, add this cron line once:{" "}
            <code className="rounded bg-card px-1.5 py-0.5 text-xs">* * * * * cd /path/to/synago-backend &amp;&amp; php artisan schedule:run</code>.
            Until then, “Run now” checks and sends due reminders by hand.
          </p>
        </div>
      )}

      {manage && rules && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Automatic reminders</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {rules.map((r) => <RuleCard key={r.key} rule={r} />)}
          </div>
          <p className="text-sm text-muted-foreground">
            Event reminders (e.g. 1 day before a crusade) are set on each event in the <Link href="/calendar" className="text-primary hover:underline">Calendar</Link>.
          </p>
        </section>
      )}

      <Tabs value={tab} onValueChange={(v) => (setTab(v as typeof tab), setPage(1))} className="gap-4">
        <TabsList>
          <TabsTrigger value="pending">Coming up</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <Card className="gap-0 py-0">
            {isLoading && !data ? <div className="m-6 h-32 animate-pulse rounded-xl bg-muted" /> : rows.length === 0 ? (
              <EmptyState icon={BellRing} title={tab === "pending" ? "Nothing waiting" : "Nothing sent yet"}
                description={tab === "pending" ? "Switch on automatic reminders above, add reminders to events, or create one." : undefined} />
            ) : (
              <ul className="divide-y">
                {rows.map((r) => {
                  const S = STATUS[r.status]
                  return (
                    <li key={r.id} className="flex items-start gap-4 px-5 py-3.5">
                      <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                        r.channel === "app" ? "bg-info/10 text-info" : "bg-primary/10 text-primary")}>
                        {r.channel === "app" ? <Bell className="size-4" /> : <MessageSquareText className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 text-sm">
                          <span className="font-semibold tabular">{when(r.remindAt)}</span>
                          <span className="text-muted-foreground">→ {r.audienceLabel} · {CHANNEL[r.channel]}</span>
                          {r.source && <Badge variant="muted" className="text-[10px]">{r.source.startsWith("rule:") ? "automatic" : r.source}</Badge>}
                        </p>
                        <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">{r.message}</p>
                        {r.note && <p className="mt-0.5 text-xs text-warning">{r.note}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={S.variant}><S.icon /> {S.label}{r.status === "sent" && r.sentCount ? ` · ${r.sentCount}` : ""}</Badge>
                        {r.status === "pending" && (
                          <Button variant="ghost" size="icon-sm" aria-label="Cancel reminder"
                            onClick={async () => { if (await runAction(() => post(`/reminders/${r.id}/cancel`), "Reminder cancelled")) refresh() }}>
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            {data?.meta && data.meta.total > 0 && <div className="border-t bg-secondary/40 px-5 py-3"><Pager meta={data.meta} onPage={setPage} /></div>}
          </Card>
        </TabsContent>
      </Tabs>

      {creating && <NewReminderDialog manage={manage} onClose={() => setCreating(false)} />}
    </Page>
  )
}

function RuleCard({ rule }: { rule: ReminderRule }) {
  const [editing, setEditing] = useState(false)
  const Icon = RULE_ICON[rule.key] ?? Bell
  const toggle = async (on: boolean) => {
    mutate("/reminder-rules", (cur?: { data: ReminderRule[] }) => cur && { data: cur.data.map((r) => (r.key === rule.key ? { ...r, enabled: on } : r)) }, false)
    if (!(await runAction(() => patch(`/reminder-rules/${rule.key}`, { enabled: on }), on ? `${rule.label} switched on` : `${rule.label} switched off`))) refresh()
  }
  return (
    <Card className={cn("gap-0 p-5 transition", rule.enabled ? "border-primary/30" : "opacity-90")}>
      <div className="flex items-start gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", rule.enabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}><Icon className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{rule.label}</p>
          <p className="text-sm text-muted-foreground">{rule.when}</p>
        </div>
        <Switch checked={rule.enabled} onCheckedChange={toggle} aria-label={`${rule.label} on/off`} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {rule.options.time && <Badge variant="outline"><Clock /> {rule.options.time}</Badge>}
        {rule.options.channel && <Badge variant="outline">{CHANNEL[rule.options.channel]}</Badge>}
        {rule.options.audience && <Badge variant="outline">{audienceText(rule.options.audience)}</Badge>}
        {rule.options.daysBefore && <Badge variant="outline">{rule.options.daysBefore} days before</Badge>}
        <Button variant="link" size="sm" className="ml-auto h-auto p-0" onClick={() => setEditing(true)}>Customise</Button>
      </div>
      {rule.options.message && <p className="mt-3 line-clamp-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs italic text-muted-foreground">“{rule.options.message}”</p>}
      {editing && <RuleDialog rule={rule} onClose={() => setEditing(false)} />}
    </Card>
  )
}

const audienceText = (a: ReminderAudience) =>
  ({ all: "All members", staff: "Staff", leaders: "Church leaders", ministry: "A ministry", cell_group: "A cell group", members: "Members", users: "Staff" })[a.type]

function AudiencePicker({ value, onChange, allowUsers }: { value: ReminderAudience; onChange: (a: ReminderAudience) => void; allowUsers?: boolean }) {
  const { data: ministries = [] } = useApi<Ministry[]>(value.type === "ministry" ? "/ministries" : null)
  const { data: cells } = useApi<CellGroupIndex>(value.type === "cell_group" ? "/cell-groups" : null)
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Select value={value.type} onValueChange={(t) => onChange({ type: t as ReminderAudience["type"] })}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All active members</SelectItem>
          <SelectItem value="staff">Church staff</SelectItem>
          <SelectItem value="leaders">Church leaders (position-holders)</SelectItem>
          <SelectItem value="ministry">A ministry</SelectItem>
          <SelectItem value="cell_group">A cell group</SelectItem>
          {allowUsers && <SelectItem value="users">Just me</SelectItem>}
        </SelectContent>
      </Select>
      {value.type === "ministry" && (
        <Select value={value.ministryId ? String(value.ministryId) : ""} onValueChange={(id) => onChange({ type: "ministry", ministryId: Number(id) })}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Which ministry?" /></SelectTrigger>
          <SelectContent>{ministries.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
        </Select>
      )}
      {value.type === "cell_group" && (
        <Select value={value.cellGroupId ? String(value.cellGroupId) : ""} onValueChange={(id) => onChange({ type: "cell_group", cellGroupId: Number(id) })}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Which cell?" /></SelectTrigger>
          <SelectContent>{cells?.groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
        </Select>
      )}
    </div>
  )
}

function RuleDialog({ rule, onClose }: { rule: ReminderRule; onClose: () => void }) {
  const { churchName } = useSettings()
  const [audience, setAudience] = useState<ReminderAudience>(rule.options.audience ?? { type: "all" })
  const [channel, setChannel] = useState(rule.options.channel ?? "sms")
  const { handleSubmit, pending, error } = useApiForm(async (fd) => {
    const options: Record<string, unknown> = { time: str(fd, "time"), channel }
    if (rule.options.message !== undefined) options.message = str(fd, "message")
    if (rule.options.daysBefore !== undefined) options.daysBefore = Number(str(fd, "daysBefore"))
    if (rule.options.audience !== undefined) options.audience = audience
    await patch(`/reminder-rules/${rule.key}`, { options })
    refresh()
    onClose()
  }, "Saved")
  const placeholders = { service_eve: "{name} {church} {services}", birthdays: "{name} {church}", group_meetings: "{name} {group} {day} {time} {place}", pledge_due: "{name} {purpose} {balance} {date}" }[rule.key]
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{rule.label}</DialogTitle><DialogDescription>{rule.when}</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="rr-time">Time</Label><Input id="rr-time" name="time" type="time" defaultValue={rule.options.time} required /></div>
            {rule.options.daysBefore !== undefined && <div className="space-y-2"><Label htmlFor="rr-days">Days before</Label><Input id="rr-days" name="daysBefore" type="number" min={1} max={30} defaultValue={rule.options.daysBefore} /></div>}
            {rule.key !== "follow_ups" && rule.key !== "week_ahead" && (
              <div className="space-y-2">
                <Label>By</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sms">SMS</SelectItem><SelectItem value="app">App</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent>
                </Select>
              </div>
            )}
          </div>
          {rule.options.audience !== undefined && <div className="space-y-2"><Label>Send to</Label><AudiencePicker value={audience} onChange={setAudience} /></div>}
          {rule.options.message !== undefined && (
            <div className="space-y-2">
              <Label htmlFor="rr-msg">Message</Label>
              <Textarea id="rr-msg" name="message" rows={4} defaultValue={rule.options.message} />
              <p className="text-xs text-muted-foreground">You can use {placeholders}. {"{church}"} becomes “{churchName}”.</p>
              <FieldError error={error} name="options.message" />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NewReminderDialog({ manage, onClose }: { manage: boolean; onClose: () => void }) {
  const [audience, setAudience] = useState<ReminderAudience>({ type: manage ? "all" : "users" })
  const [channel, setChannel] = useState<"sms" | "app" | "both">("sms")
  const tomorrow9 = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T09:00`
  })()
  const { handleSubmit, pending, error } = useApiForm(async (fd) => {
    const personal = audience.type === "users"
    await post("/reminders", { remindAt: str(fd, "remindAt"), message: str(fd, "message"), ...(personal ? {} : { audience, channel }) })
    refresh()
    onClose()
  }, "Reminder scheduled")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{manage ? "New reminder" : "Remind me"}</DialogTitle>
          <DialogDescription>{manage ? "A one-off reminder to a group, or just to yourself." : "It appears in your notifications at that time."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {manage && <div className="space-y-2"><Label>Send to</Label><AudiencePicker value={audience} onChange={setAudience} allowUsers /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="nr-at">When</Label><Input id="nr-at" name="remindAt" type="datetime-local" defaultValue={tomorrow9} required /><FieldError error={error} name="remindAt" /></div>
            {manage && audience.type !== "users" && (
              <div className="space-y-2">
                <Label>By</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sms">SMS</SelectItem><SelectItem value="app">App</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nr-msg">Message</Label>
            <Textarea id="nr-msg" name="message" rows={3} required placeholder={audience.type === "users" ? "Call Mama Sarah about the burial arrangements" : "Dear {name}, …"} />
            {audience.type !== "users" && <p className="text-xs text-muted-foreground">{"{name}"} becomes each person&apos;s first name; {"{church}"} the church name.</p>}
            <FieldError error={error} name="message" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}><BellRing className="size-4" /> Schedule</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
