"use client"

import { useMemo, useState } from "react"
import { mutate } from "swr"
import { toast } from "sonner"
import { Map as MapIcon, Plus, Wand2, ChevronRight, Home, Users, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, StatCard } from "@/components/page"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FieldError, runAction, str, useApiForm } from "@/components/form"
import { del, patch, post, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { Area, CellGroupIndex } from "@/lib/types"
import { cn } from "@/lib/utils"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/areas") || k.startsWith("/cell-groups") || k.startsWith("/reports/harvest")))
const LEVELS: Area["level"][] = ["archdeaconry", "parish", "region", "village"]
const RANK: Record<Area["level"], number> = { archdeaconry: 1, parish: 2, region: 3, village: 4 }
const LEVEL_LABEL: Record<Area["level"], string> = { archdeaconry: "Archdeaconry", parish: "Parish", region: "Region (urban)", village: "Village" }
const LEVEL_TONE: Record<Area["level"], "gold" | "info" | "success" | "muted"> = { archdeaconry: "gold", parish: "info", region: "success", village: "muted" }

export function AreasContent() {
  const { can } = useAuth()
  const canManage = can("members.manage")
  const { data: areas = [], isLoading } = useApi<Area[]>("/areas")
  const { data: cells } = useApi<CellGroupIndex>("/cell-groups")
  const [selected, setSelected] = useState<Area | null>(null)
  const [parentFor, setParentFor] = useState<Area | null>(null)
  const [dialog, setDialog] = useState<"new" | "edit" | "delete" | "build" | null>(null)

  const children = useMemo(() => {
    const m = new Map<string | null, Area[]>()
    for (const a of areas) m.set(a.parentId, [...(m.get(a.parentId) ?? []), a])
    return m
  }, [areas])
  const cellsByArea = useMemo(() => {
    const m = new Map<string, NonNullable<CellGroupIndex["groups"]>>()
    for (const g of cells?.groups ?? []) if (g.areaId) m.set(g.areaId, [...(m.get(g.areaId) ?? []), g])
    return m
  }, [cells])
  const roots = (children.get(null) ?? []).sort((a, b) => RANK[a.level] - RANK[b.level] || a.name.localeCompare(b.name))
  const unlinkedCells = (cells?.groups ?? []).filter((g) => !g.areaId)

  /** Members in an area = active members of every cell anywhere beneath it. */
  const total = (a: Area): number => a.members + (children.get(a.id) ?? []).reduce((s, c) => s + total(c), 0)

  const Node = ({ a, depth }: { a: Area; depth: number }) => {
    const kids = (children.get(a.id) ?? []).sort((x, y) => x.name.localeCompare(y.name))
    const cellList = cellsByArea.get(a.id) ?? []
    return (
      <li>
        <div className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-accent/50")} style={{ paddingLeft: 12 + depth * 24 }}>
          {depth > 0 && <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />}
          <Badge variant={LEVEL_TONE[a.level]} className="w-28 justify-center">{LEVEL_LABEL[a.level]}</Badge>
          <span className="flex-1 font-semibold">{a.name}</span>
          <span className="hidden text-sm text-muted-foreground tabular sm:inline">{total(a)} members</span>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${a.name}`} className="opacity-60 group-hover:opacity-100"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {a.level !== "village" && <DropdownMenuItem onClick={() => (setParentFor(a), setSelected(null), setDialog("new"))}><Plus className="size-4" /> Add area inside</DropdownMenuItem>}
                <DropdownMenuItem onClick={() => (setSelected(a), setDialog("edit"))}><Pencil className="size-4" /> Rename / move</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => (setSelected(a), setDialog("delete"))}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {cellList.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2" style={{ paddingLeft: 12 + (depth + 1) * 24 + 16 }}>
            {cellList.map((g) => (
              <span key={g.id} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5 text-xs">
                <Home className="size-3 text-primary" /> {g.name} <span className="text-muted-foreground tabular">· {g.members}</span>
              </span>
            ))}
          </div>
        )}
        {kids.length > 0 && <ul>{kids.map((k) => <Node key={k.id} a={k} depth={depth + 1} />)}</ul>}
      </li>
    )
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Congregation"
        title="Areas"
        description="How the church is spread out: archdeaconry, parish, region (urban) and village, with cell groups inside. Harvest and reports add up through this tree."
        actions={canManage && (
          <>
            <Button variant="outline" onClick={() => setDialog("build")}><Wand2 className="size-4" /> Build from member addresses</Button>
            <Button onClick={() => (setParentFor(null), setSelected(null), setDialog("new"))}><Plus className="size-4" /> New area</Button>
          </>
        )}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(["archdeaconry", "parish", "region", "village"] as const).map((l, i) => (
          <StatCard key={l} label={{ archdeaconry: "Archdeaconries", parish: "Parishes", region: "Regions", village: "Villages" }[l]} icon={i === 3 ? Home : MapIcon} tone={(["gold", "info", "success", "neutral"] as const)[i]}
            value={isLoading ? undefined : areas.filter((a) => a.level === l).length.toLocaleString()} />
        ))}
      </section>

      <Card className="gap-0 py-2">
        {isLoading ? <div className="m-4 h-48 animate-pulse rounded-xl bg-muted" /> : roots.length === 0 ? (
          <EmptyState icon={MapIcon} title="No areas yet" description="Build them from the villages and parishes already on members' records, then group parishes under an archdeaconry." />
        ) : (
          <ul className="px-2">{roots.map((a) => <Node key={a.id} a={a} depth={0} />)}</ul>
        )}
      </Card>

      {unlinkedCells.length > 0 && (
        <Card className="gap-3 p-5">
          <p className="text-sm font-semibold">Cell groups not placed in an area</p>
          <div className="flex flex-wrap gap-2">
            {unlinkedCells.map((g) => <span key={g.id} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs"><Home className="size-3" /> {g.name}</span>)}
          </div>
          <p className="text-xs text-muted-foreground">Set their area when editing the cell group.</p>
        </Card>
      )}

      <AreaDialog key={`new-${parentFor?.id ?? "root"}`} areas={areas} parent={parentFor} open={dialog === "new"} onOpenChange={(o) => !o && setDialog(null)} />
      <ConfirmDialog open={dialog === "build"} onOpenChange={(o) => !o && setDialog(null)} tone="default" confirmLabel="Build"
        title="Build areas from member addresses"
        description="Creates a parish for each parish on members' records and a village for each village (under the parish most of its members name), then places cell groups in their village. Existing areas are kept."
        onConfirm={async () => {
          let msg = ""
          const ok = await runAction(async () => {
            const r = await post<{ data: { created: number; cellGroupsLinked: number } }>("/areas/from-members")
            msg = `${r.data.created} areas created, ${r.data.cellGroupsLinked} cell groups placed`
          }, "Areas built")
          if (ok) { refresh(); toast.message(msg) }
          return ok
        }} />
      {selected && (
        <>
          <AreaDialog key={`e-${selected.id}`} areas={areas} record={selected} open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} />
          <ConfirmDialog open={dialog === "delete"} onOpenChange={(o) => !o && setDialog(null)} title={`Delete ${selected.name}`}
            description="Areas and cell groups inside it are kept but no longer placed under it."
            onConfirm={async () => { const ok = await runAction(() => del(`/areas/${selected.id}`), "Area deleted"); if (ok) refresh(); return ok }} />
        </>
      )}
    </Page>
  )
}

function AreaDialog({ areas, record, parent, open, onOpenChange }: { areas: Area[]; record?: Area; parent?: Area | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const firstLevel: Area["level"] = record?.level ?? (parent ? LEVELS.find((l) => RANK[l] > RANK[parent.level])! : "parish")
  const [level, setLevel] = useState<Area["level"]>(firstLevel)
  const [parentId, setParentId] = useState(record?.parentId ?? parent?.id ?? "none")
  const parents = areas.filter((a) => RANK[a.level] < RANK[level] && a.id !== record?.id)
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const body = { name: str(fd, "name"), level, parentId: parentId === "none" ? null : Number(parentId) }
    if (record) await patch(`/areas/${record.id}`, body)
    else await post("/areas", body)
    refresh()
    onOpenChange(false)
  }, record ? "Area updated" : "Area added")
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{record ? `Edit ${record.name}` : parent ? `Add inside ${parent.name}` : "New area"}</DialogTitle><DialogDescription>Each area sits inside a larger one: village → parish or region → archdeaconry.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="a-name">Name</Label><Input id="a-name" name="name" defaultValue={record?.name} required /><FieldError error={error} name="name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="a-level">Level</Label>
              <Select value={level} onValueChange={(v) => { setLevel(v as Area["level"]); setParentId("none") }}>
                <SelectTrigger id="a-level" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{LEVEL_LABEL[l]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-parent">Inside</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger id="a-parent" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— top level —</SelectItem>
                  {parents.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.level})</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError error={error} name="parentId" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
