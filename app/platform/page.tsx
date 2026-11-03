"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { mutate } from "swr"
import { Building, LogOut, Search, MoreHorizontal, CheckCircle2, PauseCircle, CalendarPlus, Hourglass, Activity, Users, MailCheck, MailWarning } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, StatCard, TableSkeleton } from "@/components/page"
import { Pager } from "@/components/pager"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { runAction } from "@/components/form"
import { patch, qs, useApi, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { date, relativeDay } from "@/lib/format"
import type { ChurchStatus, PlatformChurch, PlatformStats } from "@/lib/types"

const STATUS: Record<ChurchStatus, { label: string; variant: "info" | "success" | "danger" }> = {
  trial: { label: "Trial", variant: "info" },
  active: { label: "Active", variant: "success" },
  suspended: { label: "Suspended", variant: "danger" },
}
const refresh = () => mutate((k) => typeof k === "string" && k.startsWith("/platform"))

/** Synago platform owner console: every church, its status and trial, and simple usage numbers. */
export default function PlatformPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<"all" | ChurchStatus>("all")
  const [input, setInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [suspending, setSuspending] = useState<PlatformChurch | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/platform")
    if (!loading && user && !user.platformAdmin) router.replace("/")
  }, [loading, user, router])
  useEffect(() => {
    const t = setTimeout(() => (setSearch(input.trim()), setPage(1)), 300)
    return () => clearTimeout(t)
  }, [input])

  const ok = !!user?.platformAdmin
  const { data: stats } = useApi<PlatformStats>(ok ? "/platform/stats" : null)
  const { rows, meta, isLoading } = usePaginated<PlatformChurch>(ok ? qs("/platform/churches", { status: tab === "all" ? null : tab, search: search || null, page, perPage: 20 }) : null)

  const update = async (c: PlatformChurch, body: Record<string, unknown>, msg: string) => {
    const done = await runAction(() => patch(`/platform/churches/${c.id}`, body), msg)
    if (done) refresh()
    return done
  }
  const extendTrial = (c: PlatformChurch) => {
    const from = c.trialEndsAt && new Date(c.trialEndsAt) > new Date() ? new Date(c.trialEndsAt) : new Date()
    from.setDate(from.getDate() + 30)
    return update(c, { status: "trial", trialEndsAt: from.toISOString() }, `${c.name}: trial extended to ${from.toLocaleDateString()}`)
  }

  if (!ok) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Opening the platform console…</div>

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Building className="size-4" /></span>
            <div className="leading-tight"><p className="font-display font-semibold">Synago platform</p><p className="text-xs text-muted-foreground">Churches on Synago</p></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
            <Button variant="outline" size="sm" onClick={logout}><LogOut className="size-4" /> Sign out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Churches" icon={Building} value={stats?.churches.toLocaleString()} hint={stats && `${stats.newThisMonth} new this month`} />
          <StatCard label="On trial" icon={Hourglass} tone="info" value={stats?.trial.toLocaleString()} hint={stats && `${stats.trialsEndingThisWeek} ending this week`} />
          <StatCard label="Active (paying)" icon={CheckCircle2} tone="success" value={stats?.active.toLocaleString()} hint={stats && `${stats.suspended} suspended`} />
          <StatCard label="Used in the last 7 days" icon={Activity} tone="gold" value={stats?.activeLast7Days.toLocaleString()} hint={stats && `${stats.members.toLocaleString()} members · ${stats.users} staff`} />
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={tab} onValueChange={(v) => (setTab(v as typeof tab), setPage(1))}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="trial">Trial</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="suspended">Suspended</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Church, slug or email…" className="pl-9" />
          </div>
        </div>

        <Card className="gap-0 overflow-hidden py-0">
          {isLoading && !meta ? <TableSkeleton /> : rows.length === 0 ? <EmptyState icon={Building} title="No churches here" description="Churches appear as soon as they register." /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Church</TableHead>
                  <TableHead className="hidden lg:table-cell">Administrator</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="hidden md:table-cell">Last used</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground"><span className="font-mono">{c.slug}</span> · <span className="capitalize">{c.denomination}</span>{c.diocese ? ` · ${c.diocese}` : ""}{!c.onboarded && " · set-up not finished"}</div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {c.owner ? (
                        <>
                          <div className="flex items-center gap-1.5 text-sm">{c.owner.name}{c.owner.verified ? <MailCheck className="size-3.5 text-success" aria-label="Email confirmed" /> : <MailWarning className="size-3.5 text-warning" aria-label="Email not confirmed" />}</div>
                          <div className="text-xs text-muted-foreground">{c.owner.email}{c.owner.phone ? ` · ${c.owner.phone}` : ""}</div>
                        </>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {c.members?.toLocaleString()}
                      <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground"><Users className="size-3" />{c.users} staff</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge>
                      {c.status === "trial" && c.trialDaysLeft !== null && <div className="mt-0.5 text-xs text-muted-foreground">{c.trialDaysLeft > 0 ? `${c.trialDaysLeft} days left` : "Trial ended"}</div>}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{date(c.createdAt)}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{c.lastActiveAt ? relativeDay(c.lastActiveAt.slice(0, 10)) : "Never"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${c.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {c.status !== "active" && <DropdownMenuItem onClick={() => update(c, { status: "active" }, `${c.name} is now active`)}><CheckCircle2 className="size-4" /> Mark active (paying)</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => extendTrial(c)}><CalendarPlus className="size-4" /> Extend trial 30 days</DropdownMenuItem>
                          {c.status !== "suspended" && <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => setSuspending(c)}><PauseCircle className="size-4" /> Suspend</DropdownMenuItem></>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="border-t px-6 py-3 empty:hidden"><Pager meta={meta} onPage={setPage} /></div>
        </Card>
      </main>

      {suspending && (
        <ConfirmDialog open onOpenChange={(o) => !o && setSuspending(null)} title={`Suspend ${suspending.name}?`}
          description="Its staff can no longer sign in and reminders stop. Nothing is deleted: mark it active again to restore access."
          confirmLabel="Suspend" onConfirm={() => update(suspending, { status: "suspended" }, `${suspending.name} suspended`)} />
      )}
    </div>
  )
}
