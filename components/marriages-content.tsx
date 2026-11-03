"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { mutate } from "swr"
import { Gem, Plus, Search, CalendarClock, ScrollText, BellRing, MoreHorizontal, Pencil, Trash2, CheckCircle2, Printer, Megaphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, StatCard, TableCard, TableSkeleton } from "@/components/page"
import { Pager } from "@/components/pager"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, bool, runAction, str, useApiForm } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { del, patch, post, qs, useApi, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlParam } from "@/lib/use-url-param"
import { longDate, relativeDay, today } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import type { Marriage, MarriageStats } from "@/lib/types"
import { cn } from "@/lib/utils"
import { usePeriod } from "@/lib/period"
import { PeriodFilter, periodParams } from "@/components/period-filter"

const refresh = () => mutate((k) => typeof k === "string" && k.startsWith("/marriages"))

export function MarriagesContent() {
  const { can } = useAuth()
  const canManage = can("members.manage")
  const { denomination } = useSettings()
  const usesBanns = denomination !== "pentecostal"
  const [tab, setTab] = useState<"scheduled" | "completed">("scheduled")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const period = usePeriod("all")
  useEffect(() => setPage(1), [period.range.from, period.range.to])
  const [selected, setSelected] = useState<Marriage | null>(null)
  const [dialog, setDialog] = useState<"new" | "edit" | "delete" | null>(null)

  useUrlParam("tab", (t) => (t === "scheduled" || t === "completed") && setTab(t))
  useUrlParam("q", setSearchInput)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])
  useEffect(() => setPage(1), [tab, search])

  const { data: stats } = useApi<MarriageStats>("/marriages/stats")
  const { rows, meta, isLoading } = usePaginated<Marriage>(qs("/marriages", { status: tab, search, ...periodParams(period), page, perPage: 20 }))

  const update = async (m: Marriage, body: Partial<Marriage>, msg: string) => {
    if (await runAction(() => patch(`/marriages/${m.id}`, body), msg)) refresh()
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Congregation"
        title="Marriages"
        description={usesBanns ? "Weddings being prepared (banns and counselling) and the church's marriage register." : "Weddings being prepared and the church's marriage register."}
        actions={
          canManage && (
            <Button onClick={() => setDialog("new")}>
              <Plus className="size-4" /> Register a wedding
            </Button>
          )
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Married in ${stats?.year ?? ""}`} icon={Gem} tone="gold" value={stats?.marriedThisYear.toLocaleString()} />
        <StatCard label="Weddings planned" icon={CalendarClock} value={stats?.planned.toLocaleString()} />
        {usesBanns && <StatCard label="Banns still to read" icon={BellRing} tone="info" value={stats?.bannsPending.toLocaleString()} hint="Read on 3 Sundays before the wedding" />}
        <StatCard label="In the register" icon={ScrollText} tone="success" value={stats?.totalRegistered.toLocaleString()} />
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="scheduled">Planned</TabsTrigger>
          <TabsTrigger value="completed">Register</TabsTrigger>
        </TabsList>
      </Tabs>
      <PeriodFilter period={period} allowAll label="Wedding date" />
      </div>

      <TableCard
        title={tab === "scheduled" ? "Weddings being prepared" : "Marriage register"}
        count={meta?.total}
        actions={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Groom, bride or certificate no…" className="h-9 pl-9" />
          </div>
        }
        footer={meta && meta.total > 0 && <Pager meta={meta} onPage={setPage} />}
      >
        {isLoading && !meta ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={Gem} title={tab === "scheduled" ? "No weddings planned" : "The register is empty"} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {tab === "completed" && <TableHead>Cert. no</TableHead>}
                <TableHead>Couple</TableHead>
                <TableHead>Date</TableHead>
                {tab === "scheduled" && usesBanns && <TableHead>Banns</TableHead>}
                {tab === "scheduled" && <TableHead className="hidden md:table-cell">Counselling</TableHead>}
                <TableHead className="hidden lg:table-cell">Officiant</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  {tab === "completed" && <TableCell className="font-mono text-xs text-muted-foreground">{m.certificateNumber}</TableCell>}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-gold/15 text-gold-foreground dark:text-gold">
                        <Gem className="size-4" />
                      </span>
                      <div>
                        <p className="font-semibold">
                          {m.groomName} <span className="font-normal text-muted-foreground">&amp;</span> {m.brideName}
                        </p>
                        <p className="text-xs text-muted-foreground">{m.place ?? "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{longDate(m.date)}</p>
                    {tab === "scheduled" && <p className="text-xs text-muted-foreground">{relativeDay(m.date)}</p>}
                  </TableCell>
                  {tab === "scheduled" && usesBanns && (
                    <TableCell>
                      <div className="flex items-center gap-1.5" title={`${m.bannsRead} of 3 readings`}>
                        {[1, 2, 3].map((n) => (
                          <span key={n} className={cn("size-2.5 rounded-full", n <= m.bannsRead ? "bg-primary" : "bg-muted ring-1 ring-border")} />
                        ))}
                        <span className="ml-1 text-xs text-muted-foreground tabular">{m.bannsRead}/3</span>
                      </div>
                    </TableCell>
                  )}
                  {tab === "scheduled" && (
                    <TableCell className="hidden md:table-cell">
                      {m.counsellingDone ? <Badge variant="success">Done</Badge> : <Badge variant="warning">Pending</Badge>}
                    </TableCell>
                  )}
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{m.officiant ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Actions">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {m.status === "completed" && (
                          <DropdownMenuItem asChild>
                            <Link href={`/marriages/certificate?id=${m.id}`} target="_blank">
                              <Printer className="size-4" /> Print certificate
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {canManage && m.status === "scheduled" && usesBanns && m.bannsRead < 3 && (
                          <DropdownMenuItem onClick={() => update(m, { bannsRead: m.bannsRead + 1 }, `Banns reading ${m.bannsRead + 1} recorded`)}>
                            <Megaphone className="size-4" /> Banns read this Sunday
                          </DropdownMenuItem>
                        )}
                        {canManage && m.status === "scheduled" && (
                          <DropdownMenuItem onClick={() => update(m, { status: "completed" }, "Marriage added to the register")}>
                            <CheckCircle2 className="size-4" /> Mark solemnised
                          </DropdownMenuItem>
                        )}
                        {canManage && (
                          <>
                            <DropdownMenuItem onClick={() => (setSelected(m), setDialog("edit"))}>
                              <Pencil className="size-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => (setSelected(m), setDialog("delete"))}>
                              <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>

      <MarriageDialog key="new" open={dialog === "new"} onOpenChange={(o) => !o && setDialog(null)} usesBanns={usesBanns} />
      {selected && (
        <>
          <MarriageDialog key={`e-${selected.id}`} record={selected} open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} usesBanns={usesBanns} />
          <ConfirmDialog
            open={dialog === "delete"}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Delete marriage record"
            description={`Delete the record for ${selected.groomName} & ${selected.brideName}? This cannot be undone.`}
            onConfirm={async () => {
              const ok = await runAction(() => del(`/marriages/${selected.id}`), "Record deleted")
              if (ok) refresh()
              return ok
            }}
          />
        </>
      )}
    </Page>
  )
}

function MarriageDialog({ record, open, onOpenChange, usesBanns }: { record?: Marriage; open: boolean; onOpenChange: (o: boolean) => void; usesBanns: boolean }) {
  const { churchName } = useSettings()
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const groomId = str(fd, "groomMemberId")
    const brideId = str(fd, "brideMemberId")
    const body = {
      groomMemberId: groomId ? Number(groomId) : null,
      groomName: groomId ? null : str(fd, "groomName"),
      brideMemberId: brideId ? Number(brideId) : null,
      brideName: brideId ? null : str(fd, "brideName"),
      date: str(fd, "date"),
      status: str(fd, "status"),
      place: str(fd, "place"),
      officiant: str(fd, "officiant"),
      witnesses: str(fd, "witnesses"),
      bannsRead: Number(str(fd, "bannsRead") ?? 0),
      counsellingDone: bool(fd, "counsellingDone"),
      certificateNumber: str(fd, "certificateNumber"),
      notes: str(fd, "notes"),
    }
    if (record) await patch(`/marriages/${record.id}`, body)
    else await post("/marriages", body)
    refresh()
    onOpenChange(false)
  }, record ? "Record updated" : "Wedding registered")

  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{record ? "Edit marriage" : "Register a wedding"}</DialogTitle>
          <DialogDescription>Pick members of the church or type the names of partners from elsewhere.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="m-groom">Groom</Label>
            <MemberPicker id="m-groom" name="groomMemberId" freeTextName="groomName" placeholder="Member or full name"
              initial={record?.groomMemberId ? { id: record.groomMemberId, name: record.groomName } : null}
              initialText={record && !record.groomMemberId ? record.groomName : undefined} />
            <FieldError error={error} name="groomName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-bride">Bride</Label>
            <MemberPicker id="m-bride" name="brideMemberId" freeTextName="brideName" placeholder="Member or full name"
              initial={record?.brideMemberId ? { id: record.brideMemberId, name: record.brideName } : null}
              initialText={record && !record.brideMemberId ? record.brideName : undefined} />
            <FieldError error={error} name="brideName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-date">Wedding date</Label>
            <Input id="m-date" name="date" type="date" defaultValue={record?.date ?? today()} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-status">Status</Label>
            <Select name="status" defaultValue={record?.status ?? "scheduled"}>
              <SelectTrigger id="m-status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Planned</SelectItem>
                <SelectItem value="completed">Solemnised</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-place">Place</Label>
            <Input id="m-place" name="place" defaultValue={record?.place ?? churchName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-off">Officiating minister</Label>
            <Input id="m-off" name="officiant" defaultValue={record?.officiant ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="m-wit">Witnesses</Label>
            <Input id="m-wit" name="witnesses" defaultValue={record?.witnesses ?? ""} placeholder="Separate names with commas" />
          </div>
          {usesBanns ? (
            <div className="space-y-2">
              <Label htmlFor="m-banns">Banns read</Label>
              <Select name="bannsRead" defaultValue={String(record?.bannsRead ?? 0)}>
                <SelectTrigger id="m-banns" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n === 3 ? "All 3 Sundays" : `${n} of 3`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <input type="hidden" name="bannsRead" value={record?.bannsRead ?? 0} />
          )}
          <div className="flex items-center justify-between rounded-xl border bg-secondary/40 px-4 py-3">
            <Label htmlFor="m-couns">Pre-marital counselling done</Label>
            <Switch id="m-couns" name="counsellingDone" defaultChecked={record?.counsellingDone ?? false} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-cert">Certificate no.</Label>
            <Input id="m-cert" name="certificateNumber" placeholder="Issued automatically" defaultValue={record?.certificateNumber ?? ""} />
            <FieldError error={error} name="certificateNumber" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="m-notes">Notes</Label>
            <Textarea id="m-notes" name="notes" rows={2} defaultValue={record?.notes ?? ""} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : record ? "Save changes" : "Register wedding"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
