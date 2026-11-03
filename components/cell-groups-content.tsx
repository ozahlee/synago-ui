"use client"

import { useEffect, useState } from "react"
import { mutate } from "swr"
import { toast } from "sonner"
import { Home, Plus, Wand2, MapPin, CalendarDays, Users, UserX, MoreHorizontal, Pencil, Trash2, X, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, PersonAvatar, StatCard } from "@/components/page"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, runAction, str, useApiForm } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { del, patch, post, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlParam } from "@/lib/use-url-param"
import type { Area, CellGroup, CellGroupIndex } from "@/lib/types"
import { CURRENCY } from "@/lib/format"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/cell-groups") || k.startsWith("/members")))
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export function CellGroupsContent() {
  const { can } = useAuth()
  const canManage = can("members.manage")
  const { data, isLoading } = useApi<CellGroupIndex>("/cell-groups")
  const [selected, setSelected] = useState<CellGroup | null>(null)
  const [dialog, setDialog] = useState<"new" | "edit" | "view" | "delete" | "auto" | null>(null)
  const groups = data?.groups ?? []
  const [openId, setOpenId] = useState<string | null>(null)
  useUrlParam("open", setOpenId)
  useEffect(() => {
    const g = openId && data?.groups.find((x) => x.id === openId)
    if (g) {
      setSelected(g)
      setDialog("view")
      setOpenId(null)
    }
  }, [openId, data])
  const inGroups = groups.reduce((s, g) => s + g.members, 0)

  return (
    <Page>
      <PageHeader
        eyebrow="Congregation"
        title="Cell groups"
        description="Home fellowships near where members live, for prayer, Bible study and care between Sundays."
        actions={
          canManage && (
            <>
              {!!data?.unassigned.byVillage.some((v) => v.village) && (
                <Button variant="outline" onClick={() => setDialog("auto")}><Wand2 className="size-4" /> Group by village</Button>
              )}
              <Button onClick={() => setDialog("new")}><Plus className="size-4" /> New cell group</Button>
            </>
          )
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Cell groups" icon={Home} value={data && groups.length.toLocaleString()} />
        <StatCard label="Members in a cell" icon={Users} tone="success" value={data && inGroups.toLocaleString()} />
        <StatCard label="Not yet in a cell" icon={UserX} tone={data?.unassigned.total ? "gold" : "success"} value={data?.unassigned.total.toLocaleString()} hint="Active members" />
      </section>

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : groups.length === 0 ? (
        <Card className="py-0">
          <EmptyState icon={Home} title="No cell groups yet" description="Create one per village with one click, then appoint leaders and hosts."
            action={canManage && <Button variant="outline" onClick={() => setDialog("auto")}><Wand2 className="size-4" /> Group by village</Button>} />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <Card key={g.id} className="cursor-pointer gap-0 p-5 transition hover:-translate-y-0.5 hover:border-primary/25" onClick={() => (setSelected(g), setDialog("view"))}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{g.name}</h3>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" />{[g.village, g.parish].filter(Boolean).join(", ") || "No area set"}</p>
                </div>
                {canManage && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => (setSelected(g), setDialog("edit"))}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => (setSelected(g), setDialog("delete"))}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
                {g.leader ? <PersonAvatar name={g.leader} /> : <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">?</span>}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{g.leader ?? "No leader yet"}</p>
                  <p className="truncate text-xs text-muted-foreground">Leader{g.host ? ` · hosted at ${g.host}` : ""}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Users className="size-4" /><span className="font-medium text-foreground tabular">{g.members}</span> {g.members === 1 ? "member" : "members"}</span>
                {g.meetingDay && <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{g.meetingDay}{g.meetingTime ? ` · ${g.meetingTime}` : ""}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!!data?.unassigned.total && (
        <Card>
          <CardHeader>
            <CardTitle>Not yet in a cell group</CardTitle>
            <CardDescription>Active members by village. &ldquo;Group by village&rdquo; places them in the group for their village.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.unassigned.byVillage.map((v) => (
              <span key={v.village ?? "none"} className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm">
                <MapPin className="size-3.5 text-muted-foreground" />{v.village ?? "No village recorded"}
                <span className="rounded-full bg-secondary px-2 text-xs font-semibold tabular">{v.count}</span>
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      <GroupDialog key="new" open={dialog === "new"} onOpenChange={(o) => !o && setDialog(null)} />
      <ConfirmDialog
        open={dialog === "auto"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Group members by village"
        description="Every active member who isn't in a cell group joins the group for their village. Villages without a group get a new “Village Cell”. You can rename groups and move people afterwards."
        confirmLabel="Group them"
        tone="default"
        onConfirm={async () => {
          let msg = ""
          const ok = await runAction(async () => {
            const r = await post<{ data: { created: number; assigned: number } }>("/cell-groups/from-villages")
            msg = `${r.data.assigned} members placed, ${r.data.created} new groups`
          }, "Done")
          if (ok) {
            refresh()
            if (msg) toast.message(msg)
          }
          return ok
        }}
      />
      {selected && (
        <>
          <GroupDialog key={`e-${selected.id}`} record={selected} open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} />
          <GroupMembers id={selected.id} canManage={canManage} open={dialog === "view"} onOpenChange={(o) => !o && setDialog(null)} />
          <ConfirmDialog open={dialog === "delete"} onOpenChange={(o) => !o && setDialog(null)} title="Delete cell group"
            description={`Delete ${selected.name}? Its ${selected.members} members stay in the directory, just without a cell group.`}
            onConfirm={async () => { const ok = await runAction(() => del(`/cell-groups/${selected.id}`), "Cell group deleted"); if (ok) refresh(); return ok }} />
        </>
      )}
    </Page>
  )
}

function GroupMembers({ id, canManage, open, onOpenChange }: { id: string; canManage: boolean; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: g, mutate: reload } = useApi<CellGroup>(open ? `/cell-groups/${id}` : null)
  const [pickerKey, setPickerKey] = useState(0)
  const add = useApiForm(async (fd) => {
    const memberId = str(fd, "memberId")
    if (!memberId) throw new Error("Pick a member first")
    await post(`/cell-groups/${id}/members`, { memberIds: [Number(memberId)] })
    setPickerKey((k) => k + 1)
    reload()
    refresh()
  }, "Added to the group")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {!g ? (<><DialogTitle className="sr-only">Loading</DialogTitle><div className="h-48 animate-pulse rounded-xl bg-muted" /></>) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">{g.name}</DialogTitle>
              <DialogDescription>
                {[g.meetingDay && `${g.meetingDay}s${g.meetingTime ? ` at ${g.meetingTime}` : ""}`, g.host && `at ${g.host}`, g.location].filter(Boolean).join(" · ") || "Meeting details not set"}
              </DialogDescription>
            </DialogHeader>
            {g.leader && (
              <div className="flex items-center gap-3 rounded-xl border p-3">
                <PersonAvatar name={g.leader} />
                <div className="flex-1"><p className="text-sm font-semibold">{g.leader}</p><p className="text-xs text-muted-foreground">Leader</p></div>
                {g.leaderPhone && <Button variant="outline" size="sm" asChild><a href={`tel:${g.leaderPhone}`}><Phone className="size-4" /> Call</a></Button>}
              </div>
            )}
            {canManage && (
              <form onSubmit={add.handleSubmit} className="flex gap-2">
                <div className="flex-1"><MemberPicker key={pickerKey} name="memberId" placeholder="Add a member…" /></div>
                <Button type="submit" disabled={add.pending}><Plus className="size-4" /> Add</Button>
              </form>
            )}
            <ul className="divide-y rounded-xl border">
              {g.memberList?.length === 0 && <li className="p-4 text-sm text-muted-foreground">No members yet.</li>}
              {g.memberList?.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                  <PersonAvatar name={m.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{[m.pledgeNumber, m.phone, m.village].filter(Boolean).join(" · ")}</p>
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove ${m.name}`}
                      onClick={async () => { if (await runAction(() => del(`/cell-groups/${id}/members/${m.id}`), "Removed from group")) (reload(), refresh()) }}>
                      <X className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function GroupDialog({ record, open, onOpenChange }: { record?: CellGroup; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: areas = [] } = useApi<Area[]>(open ? "/areas" : null)
  const [areaId, setAreaId] = useState(record?.areaId ?? "none")
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const leaderId = str(fd, "leaderId")
    const body = { name: str(fd, "name"), leaderId: leaderId ? Number(leaderId) : null, host: str(fd, "host"), village: str(fd, "village"),
      parish: str(fd, "parish"), meetingDay: str(fd, "meetingDay"), meetingTime: str(fd, "meetingTime"), location: str(fd, "location"),
      areaId: areaId === "none" ? null : Number(areaId), harvestTarget: str(fd, "harvestTarget") ? Number(str(fd, "harvestTarget")) : null }
    if (record) await patch(`/cell-groups/${record.id}`, body)
    else await post("/cell-groups", body)
    refresh()
    onOpenChange(false)
  }, record ? "Cell group updated" : "Cell group created")

  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{record ? `Edit ${record.name}` : "New cell group"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="g-name">Name</Label><Input id="g-name" name="name" defaultValue={record?.name} placeholder="e.g. Kireka Cell" required /><FieldError error={error} name="name" /></div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="g-lead">Leader</Label>
            <MemberPicker id="g-lead" name="leaderId" placeholder="Search a member…" initial={record?.leaderId && record.leader ? { id: record.leaderId, name: record.leader } : null} />
          </div>
          <div className="space-y-2"><Label htmlFor="g-vil">Village</Label><Input id="g-vil" name="village" defaultValue={record?.village ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="g-par">Parish</Label><Input id="g-par" name="parish" defaultValue={record?.parish ?? ""} /></div>
          <div className="space-y-2">
            <Label htmlFor="g-day">Meets on</Label>
            <Select name="meetingDay" defaultValue={record?.meetingDay ?? undefined}>
              <SelectTrigger id="g-day" className="w-full"><SelectValue placeholder="Day" /></SelectTrigger>
              <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="g-time">Time</Label><Input id="g-time" name="meetingTime" type="time" defaultValue={record?.meetingTime ?? ""} /></div>
          <div className="space-y-2">
            <Label htmlFor="g-area">Area (village / region)</Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger id="g-area" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not placed</SelectItem>
                {areas.filter((a) => a.level === "village" || a.level === "region").map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.level})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="g-target">Harvest target ({CURRENCY})</Label><Input id="g-target" name="harvestTarget" type="number" min="0" step="0.01" defaultValue={record?.harvestTarget ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="g-host">Host home</Label><Input id="g-host" name="host" defaultValue={record?.host ?? ""} placeholder="e.g. Mama Sarah's home" /></div>
          <div className="space-y-2"><Label htmlFor="g-loc">Directions</Label><Input id="g-loc" name="location" defaultValue={record?.location ?? ""} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save group"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
