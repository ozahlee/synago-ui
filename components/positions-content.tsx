"use client"

import { useState } from "react"
import { mutate } from "swr"
import { BadgeCheck, Plus, KeyRound, MoreHorizontal, Pencil, Trash2, CalendarX, School, UsersRound, Home, Church, Hammer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, PersonAvatar, TableCard, TableSkeleton } from "@/components/page"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, runAction, str, useApiForm } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { del, patch, post, qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { longDate, today } from "@/lib/format"
import type { Position, PositionScope } from "@/lib/types"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/positions") || k.startsWith("/sunday-school") || k.startsWith("/members") || k.startsWith("/users")))

const SCOPES: Record<PositionScope, { label: string; icon: typeof Church; titles: string[] }> = {
  church: { label: "Whole church", icon: Church, titles: ["Church warden", "Lay reader", "Catechist", "Parish secretary", "Treasurer", "Council member"] },
  ministry: { label: "Ministry", icon: UsersRound, titles: ["Chairperson", "Vice chairperson", "Secretary", "Treasurer", "Coordinator"] },
  cell_group: { label: "Cell group", icon: Home, titles: ["Cell leader", "Assistant leader", "Host"] },
  sunday_school_class: { label: "Sunday school class", icon: School, titles: ["Sunday school teacher", "Assistant teacher", "Superintendent"] },
  project: { label: "Project", icon: Hammer, titles: ["Project chairperson", "Project treasurer", "Committee member"] },
}

export function PositionsContent() {
  const { can } = useAuth()
  const canManage = can("members.manage")
  const canGrant = can("users.manage")
  const [scope, setScope] = useState("all")
  const [includePast, setIncludePast] = useState(false)
  const [selected, setSelected] = useState<Position | null>(null)
  const [dialog, setDialog] = useState<"new" | "edit" | "login" | "end" | "delete" | null>(null)
  const { data: rows = [], isLoading } = useApi<Position[]>(qs("/positions", { scopeType: scope, includePast: includePast ? 1 : undefined }))
  const act = (p: Position, d: typeof dialog) => (setSelected(p), setDialog(d))

  return (
    <Page>
      <PageHeader
        eyebrow="Administration"
        title="Positions"
        description="Who holds which office: teachers, chairpersons, cell leaders, wardens. Give a position-holder a login and they see only their own group."
        actions={canManage && <Button onClick={() => setDialog("new")}><Plus className="size-4" /> Appoint</Button>}
      />

      <TableCard
        title="Office holders"
        count={rows.length}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger size="sm" className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                {(Object.keys(SCOPES) as PositionScope[]).map((s) => <SelectItem key={s} value={s}>{SCOPES[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm text-muted-foreground"><Switch checked={includePast} onCheckedChange={setIncludePast} /> Include past</label>
          </div>
        }
      >
        {isLoading ? <TableSkeleton /> : rows.length === 0 ? (
          <EmptyState icon={BadgeCheck} title="No positions recorded" description="Appoint Sunday school teachers, ministry chairs and cell leaders." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="hidden md:table-cell">Since</TableHead>
                <TableHead>Login</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const S = SCOPES[p.scopeType]
                return (
                  <TableRow key={p.id} className={p.current ? "" : "opacity-60"}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <PersonAvatar name={p.member ?? "?"} />
                        <div><p className="font-semibold">{p.member}</p><p className="text-xs text-muted-foreground">{p.memberPhone ?? ""}</p></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{p.title}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><S.icon className="size-3.5" />{p.scopeName}</p>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {p.startDate ? longDate(p.startDate) : "—"}
                      {p.endDate && <p className="text-xs text-muted-foreground">until {longDate(p.endDate)}</p>}
                    </TableCell>
                    <TableCell>
                      {p.login ? <Badge variant={p.login.active ? "success" : "muted"}>{p.login.email}</Badge>
                        : p.scopeType !== "church" && p.scopeType !== "project" ? <span className="text-xs text-muted-foreground">None</span> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {canGrant && !p.login && p.current && ["ministry", "cell_group", "sunday_school_class"].includes(p.scopeType) && (
                              <DropdownMenuItem onClick={() => act(p, "login")}><KeyRound className="size-4" /> Give login</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => act(p, "edit")}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                            {p.current && <DropdownMenuItem onClick={() => act(p, "end")}><CalendarX className="size-4" /> End term today</DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => act(p, "delete")}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </TableCard>

      <PositionDialog key="new" open={dialog === "new"} onOpenChange={(o) => !o && setDialog(null)} />
      {selected && (
        <>
          <PositionDialog key={`e-${selected.id}`} record={selected} open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} />
          <LoginDialog key={`l-${selected.id}`} position={selected} open={dialog === "login"} onOpenChange={(o) => !o && setDialog(null)} />
          <ConfirmDialog open={dialog === "end"} onOpenChange={(o) => !o && setDialog(null)} title="End this term" tone="default" confirmLabel="End term"
            description={`${selected.member} stops being ${selected.title} (${selected.scopeName}) today. Their history is kept${selected.login ? " and their login loses access to this group" : ""}.`}
            onConfirm={async () => { const ok = await runAction(() => patch(`/positions/${selected.id}`, { endDate: today() }), "Term ended"); if (ok) refresh(); return ok }} />
          <ConfirmDialog open={dialog === "delete"} onOpenChange={(o) => !o && setDialog(null)} title="Delete position"
            description="Delete this record entirely? To keep history, end the term instead."
            onConfirm={async () => { const ok = await runAction(() => del(`/positions/${selected.id}`), "Position deleted"); if (ok) refresh(); return ok }} />
        </>
      )}
    </Page>
  )
}

function PositionDialog({ record, open, onOpenChange }: { record?: Position; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [scopeType, setScopeType] = useState<PositionScope>(record?.scopeType ?? "sunday_school_class")
  const [scopeId, setScopeId] = useState(record?.scopeId ?? "")
  const [title, setTitle] = useState(record?.title ?? SCOPES[record?.scopeType ?? "sunday_school_class"].titles[0])
  const { data: scopes } = useApi<Record<string, Array<{ id: string; name: string }>>>(open ? "/positions/scopes" : null)

  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const memberId = str(fd, "memberId")
    const body = { memberId: memberId ? Number(memberId) : undefined, title, scopeType, scopeId: scopeType === "church" ? null : Number(scopeId) || null, startDate: str(fd, "startDate") }
    if (record) await patch(`/positions/${record.id}`, body)
    else await post("/positions", body)
    refresh()
    onOpenChange(false)
  }, record ? "Position updated" : "Appointed")

  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{record ? "Edit position" : "Appoint someone"}</DialogTitle><DialogDescription>Positions show on the member's profile and on the group.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="p-m">Member</Label>
            <MemberPicker id="p-m" name="memberId" initial={record ? { id: record.memberId, name: record.member ?? "" } : null} />
            <FieldError error={error} name="memberId" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-scope">Over</Label>
            <Select value={scopeType} onValueChange={(v) => { setScopeType(v as PositionScope); setScopeId(""); setTitle(SCOPES[v as PositionScope].titles[0]) }}>
              <SelectTrigger id="p-scope" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(SCOPES) as PositionScope[]).map((s) => <SelectItem key={s} value={s}>{SCOPES[s].label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {scopeType !== "church" && (
            <div className="space-y-2">
              <Label htmlFor="p-group">Which one</Label>
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger id="p-group" className="w-full"><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>{scopes?.[scopeType]?.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
              <FieldError error={error} name="scopeId" />
            </div>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="p-title">Title</Label>
            <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} list="position-titles" required />
            <datalist id="position-titles">{SCOPES[scopeType].titles.map((t) => <option key={t} value={t} />)}</datalist>
          </div>
          <div className="space-y-2"><Label htmlFor="p-start">Since</Label><Input id="p-start" name="startDate" type="date" defaultValue={record?.startDate ?? today()} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : record ? "Save" : "Appoint"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LoginDialog({ position, open, onOpenChange }: { position: Position; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    await post(`/positions/${position.id}/login`, { email: str(fd, "email"), password: str(fd, "password") })
    refresh()
    onOpenChange(false)
  }, `${position.member} can now sign in`)
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Give {position.member} a login</DialogTitle>
          <DialogDescription>They will only see <span className="font-medium text-foreground">My groups</span>: {position.scopeName}, its people and its register. Nothing else.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="l-email">Email</Label><Input id="l-email" name="email" type="email" required /><FieldError error={error} name="email" /></div>
          <div className="space-y-2"><Label htmlFor="l-pass">Temporary password</Label><Input id="l-pass" name="password" type="text" minLength={8} required /><FieldError error={error} name="password" /><p className="text-xs text-muted-foreground">Share it privately; they can change it under Profile.</p></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}><KeyRound className="size-4" /> Create login</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
