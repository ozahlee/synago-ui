"use client"

import { useEffect, useState } from "react"
import { mutate } from "swr"
import { Home, Plus, Search, Users, UserX, MoreHorizontal, Pencil, Trash2, Crown, X, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, PersonAvatar, StatCard, TableCard, TableSkeleton } from "@/components/page"
import { Pager } from "@/components/pager"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, runAction, str, useApiForm } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { del, patch, post, qs, useApi, usePaginated, type Paginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlParam } from "@/lib/use-url-param"
import type { Household } from "@/lib/types"
import { cn } from "@/lib/utils"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/households") || k.startsWith("/members") || k.includes("/summary")))
type HouseholdPage = Paginated<Household> & { stats: { households: number; membersInFamilies: number; membersWithout: number } }

export function HouseholdsContent() {
  const { can } = useAuth()
  const canManage = can("members.manage")
  const [input, setInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState<string | null>(null)
  const [editing, setEditing] = useState<Household | "new" | null>(null)
  const [removing, setRemoving] = useState<Household | null>(null)
  useUrlParam("open", setViewing)
  useEffect(() => {
    const t = setTimeout(() => (setSearch(input.trim()), setPage(1)), 300)
    return () => clearTimeout(t)
  }, [input])
  const res = usePaginated<Household>(qs("/households", { search: search || null, page, perPage: 20 }))
  const stats = (res.data as HouseholdPage | undefined)?.stats

  return (
    <Page>
      <PageHeader
        eyebrow="Congregation"
        title="Families"
        description="Households in the church: who belongs together, who heads the home. Used for family giving, thanksgiving and pastoral visits."
        actions={canManage && <Button onClick={() => setEditing("new")}><Plus className="size-4" /> New family</Button>}
      />
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Families" icon={Home} value={stats?.households.toLocaleString()} />
        <StatCard label="Members in a family" icon={Users} tone="success" value={stats?.membersInFamilies.toLocaleString()} />
        <StatCard label="Active members not yet placed" icon={UserX} tone="danger" value={stats?.membersWithout.toLocaleString()} hint="Add them from a family's page" />
      </section>

      <TableCard
        title="All families"
        count={res.meta?.total}
        actions={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Family or head's name…" className="pl-9" />
          </div>
        }
        footer={<Pager meta={res.meta} onPage={setPage} />}
      >
        {res.isLoading ? <TableSkeleton /> : res.rows.length === 0 ? (
          <EmptyState icon={Home} title={search ? "No family matches" : "No families yet"} description="Create a family, choose its head, then add its members." />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Family</TableHead><TableHead className="hidden sm:table-cell">Head</TableHead><TableHead className="hidden md:table-cell">Village</TableHead><TableHead className="text-right">Members</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
            <TableBody>
              {res.rows.map((h) => (
                <TableRow key={h.id} className="cursor-pointer" onClick={() => setViewing(h.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Home className="size-4" /></span>
                      <div><div className="font-medium">{h.name}</div>{h.phone && <div className="text-xs text-muted-foreground">{h.phone}</div>}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{h.head ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{h.village ?? "—"}</TableCell>
                  <TableCell className="text-right tabular">{h.members}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewing(h.id)}><Users className="size-4" /> Members</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditing(h)}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setRemoving(h)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>

      {viewing && <HouseholdDialog id={viewing} canManage={canManage} onEdit={(h) => (setViewing(null), setEditing(h))} open onOpenChange={(o) => !o && setViewing(null)} />}
      {editing && <HouseholdForm record={editing === "new" ? undefined : editing} open onOpenChange={(o) => !o && setEditing(null)} onCreated={(id) => setViewing(id)} />}
      {removing && (
        <ConfirmDialog open onOpenChange={(o) => !o && setRemoving(null)} title={`Delete ${removing.name}?`}
          description="Its members stay in the register; they are just no longer grouped as a family."
          onConfirm={async () => { const ok = await runAction(() => del(`/households/${removing.id}`), "Family deleted"); if (ok) refresh(); return ok }} />
      )}
    </Page>
  )
}

function HouseholdForm({ record, open, onOpenChange, onCreated }: { record?: Household; open: boolean; onOpenChange: (o: boolean) => void; onCreated?: (id: string) => void }) {
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const head = str(fd, "headMemberId")
    const body = { name: str(fd, "name"), headMemberId: head ? Number(head) : null, phone: str(fd, "phone"), village: str(fd, "village"), notes: str(fd, "notes") }
    if (record) await patch(`/households/${record.id}`, body)
    else {
      const r = await post<{ data: Household }>("/households", body)
      onCreated?.(r.data.id)
    }
    refresh()
    onOpenChange(false)
  }, record ? "Family updated" : "Family created")
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{record ? `Edit ${record.name}` : "New family"}</DialogTitle><DialogDescription>Usually named after the head of the home, e.g. “The Okello family”.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="hh-n">Family name</Label><Input id="hh-n" name="name" defaultValue={record?.name} required placeholder="The Okello family" /><FieldError error={error} name="name" /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="hh-h">Head of the home</Label><MemberPicker id="hh-h" name="headMemberId" initial={record?.headMemberId && record.head ? { id: record.headMemberId, name: record.head } : null} /><p className="text-xs text-muted-foreground">The head is added to the family automatically.</p></div>
          <div className="space-y-2"><Label htmlFor="hh-p">Family phone</Label><Input id="hh-p" name="phone" type="tel" defaultValue={record?.phone ?? ""} placeholder="Defaults to the head's" /></div>
          <div className="space-y-2"><Label htmlFor="hh-v">Village / estate</Label><Input id="hh-v" name="village" defaultValue={record?.village ?? ""} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="hh-no">Notes</Label><Textarea id="hh-no" name="notes" rows={2} defaultValue={record?.notes ?? ""} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save family"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function HouseholdDialog({ id, canManage, onEdit, open, onOpenChange }: { id: string; canManage: boolean; onEdit: (h: Household) => void; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: h, mutate: reload } = useApi<Household>(`/households/${id}`)
  const [picker, setPicker] = useState(0)
  const add = async (memberId: string) => {
    if (await runAction(() => post(`/households/${id}/members`, { memberIds: [Number(memberId)] }), "Added to the family")) { reload(); refresh(); setPicker((k) => k + 1) }
  }
  const remove = async (memberId: string) => {
    if (await runAction(() => del(`/households/${id}/members/${memberId}`), "Removed from the family")) { reload(); refresh() }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Home className="size-5 text-primary" />{h?.name ?? "Family"}</DialogTitle>
          <DialogDescription>{h ? [h.head && `Head: ${h.head}`, h.village, h.phone].filter(Boolean).join(" · ") || "No details yet" : "Loading…"}</DialogDescription>
        </DialogHeader>
        {!h ? <div className="h-40 animate-pulse rounded-xl bg-muted" /> : (
          <>
            <ul className="divide-y rounded-xl border">
              {(h.memberList ?? []).length === 0 && <li className="p-4 text-sm text-muted-foreground">No members yet.</li>}
              {(h.memberList ?? []).map((m) => (
                <li key={m.id} className="flex items-center gap-3 p-3">
                  <PersonAvatar name={m.name} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-medium">{m.name}{m.isHead && <Badge variant="gold" className="gap-1"><Crown className="size-3" /> Head</Badge>}{m.status !== "active" && <Badge variant="muted">{m.status}</Badge>}</div>
                    <div className="text-xs text-muted-foreground">{[m.age !== null && `${m.age} yrs`, m.gender, m.pledgeNumber, m.phone].filter(Boolean).join(" · ")}</div>
                  </div>
                  {canManage && <Button variant="ghost" size="icon" className="size-8" onClick={() => remove(m.id)} aria-label={`Remove ${m.name}`}><X className="size-4" /></Button>}
                </li>
              ))}
            </ul>
            {canManage && (
              <div className="space-y-2">
                <Label htmlFor="hh-add" className="flex items-center gap-1.5"><UserPlus className="size-4" /> Add a member</Label>
                <MemberPicker key={picker} id="hh-add" name="addMember" placeholder="Search the register…" onSelect={(m) => m && add(m.id)} />
              </div>
            )}
            {h.notes && <p className="rounded-xl bg-muted px-3 py-2 text-sm">{h.notes}</p>}
          </>
        )}
        <DialogFooter>
          {canManage && h && <Button variant="outline" onClick={() => onEdit(h)}><Pencil className="size-4" /> Edit details</Button>}
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Search-as-you-type family selector (GET /households?search=). Submits the id in a hidden input. */
export function HouseholdPicker({ id, name, initial }: { id?: string; name: string; initial?: { id: string; name: string } | null }) {
  const [query, setQuery] = useState(initial?.name ?? "")
  const [debounced, setDebounced] = useState("")
  const [selected, setSelected] = useState(initial ?? null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250)
    return () => clearTimeout(t)
  }, [query])
  const { rows, isLoading } = usePaginated<Household>(open && !selected ? qs("/households", { search: debounced || null, perPage: 8 }) : null)
  return (
    <div className="relative">
      <Input id={id} value={query} placeholder="Search families…" autoComplete="off"
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setSelected(null) }} />
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {open && !selected && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
          {isLoading && <p className="px-2 py-1.5 text-sm text-muted-foreground">Searching…</p>}
          {!isLoading && rows.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">No families found — create one under Congregation → Families</p>}
          {rows.map((h) => (
            <button type="button" key={h.id} onMouseDown={(e) => e.preventDefault()} onClick={() => { setSelected({ id: h.id, name: h.name }); setQuery(h.name); setOpen(false) }}
              className={cn("flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent")}>
              <span className="font-medium">{h.name}</span>
              <span className="text-xs text-muted-foreground">{h.head ?? ""}{h.members ? ` · ${h.members}` : ""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
