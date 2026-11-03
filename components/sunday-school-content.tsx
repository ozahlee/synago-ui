"use client"

import { useState } from "react"
import { mutate } from "swr"
import { School, Plus, Wand2, Users, UserX, MoreHorizontal, Pencil, Trash2, Phone, GraduationCap, DoorOpen } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader, PersonAvatar, StatCard } from "@/components/page"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ClassRegister } from "@/components/class-register"
import { FieldError, num, runAction, str, useApiForm } from "@/components/form"
import { del, patch, post, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { SundaySchoolClass, SundaySchoolIndex } from "@/lib/types"

const refresh = () => mutate((k) => typeof k === "string" && (k.startsWith("/sunday-school") || k.startsWith("/members") || k === "/dashboard"))

export function SundaySchoolContent() {
  const { can } = useAuth()
  const canManage = can("members.manage")
  const { data, isLoading } = useApi<SundaySchoolIndex>("/sunday-school/classes")
  const [selected, setSelected] = useState<SundaySchoolClass | null>(null)
  const [dialog, setDialog] = useState<"new" | "edit" | "view" | "delete" | "sort" | null>(null)
  const classes = data?.classes ?? []

  return (
    <Page>
      <PageHeader
        eyebrow="Congregation"
        title="Sunday school"
        description={`Children aged ${data?.maxAge ?? 12} and under are enrolled automatically when registered, in the class for their age. Teachers are set under Positions.`}
        actions={
          canManage && (
            <>
              <Button variant="outline" onClick={() => setDialog("sort")}><Wand2 className="size-4" /> Sort by age</Button>
              <Button onClick={() => setDialog("new")}><Plus className="size-4" /> New class</Button>
            </>
          )
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Children enrolled" icon={Users} value={data?.enrolled.toLocaleString()} />
        <StatCard label="Classes" icon={School} tone="info" value={data && classes.length.toLocaleString()} hint={data && `${classes.reduce((s, c) => s + c.teachers.length, 0)} teachers`} />
        <StatCard label="Not in a class" icon={UserX} tone={data?.unplaced ? "gold" : "success"} value={data?.unplaced.toLocaleString()} hint={data?.unplaced ? "Use “Sort by age”" : "Everyone is placed"} />
      </section>

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : classes.length === 0 ? (
        <Card className="py-0"><EmptyState icon={School} title="No classes yet" description="Create classes by age (e.g. Beginners 0–5, Primary 6–8, Juniors 9–12)." /></Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((c, i) => (
            <Card key={c.id} className="cursor-pointer gap-0 overflow-hidden py-0 transition hover:-translate-y-0.5 hover:border-primary/25" onClick={() => (setSelected(c), setDialog("view"))}>
              <div className="h-1.5" style={{ background: `var(--chart-${(i % 5) + 1})` }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{c.name}</h3>
                    <p className="text-sm text-muted-foreground">Ages {c.minAge}–{c.maxAge}{c.room ? ` · ${c.room}` : ""}</p>
                  </div>
                  {canManage && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => (setSelected(c), setDialog("edit"))}><Pencil className="size-4" /> Edit class</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => (setSelected(c), setDialog("delete"))}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-secondary/60 p-3">
                    <p className="text-2xl font-semibold tabular">{c.pupils}</p>
                    <p className="text-xs text-muted-foreground">pupils</p>
                  </div>
                  <div className="rounded-xl bg-secondary/60 p-3">
                    <p className="text-2xl font-semibold tabular">{c.lastAttendance ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">last Sunday</p>
                  </div>
                </div>
                <div className="mt-4 border-t pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teachers</p>
                  {c.teachers.length ? (
                    <div className="flex flex-wrap gap-2">
                      {c.teachers.map((t) => (
                        <span key={t.memberId} className="inline-flex items-center gap-1.5 rounded-full border bg-card py-0.5 pl-0.5 pr-2.5 text-xs font-medium">
                          <PersonAvatar name={t.name ?? "?"} className="size-6 text-[10px]" /> {t.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No teacher yet. Add one under Positions.</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ClassDialog key="new" open={dialog === "new"} onOpenChange={(o) => !o && setDialog(null)} />
      <ConfirmDialog
        open={dialog === "sort"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Sort children into classes by age"
        description="Every member aged 12 or under is enrolled and moved to the class for their age. Anyone older than 12 graduates out of Sunday school."
        confirmLabel="Sort now"
        tone="default"
        onConfirm={async () => {
          let msg = ""
          const ok = await runAction(async () => {
            const r = await post<{ data: { placed: number; moved: number; graduated: number } }>("/sunday-school/auto-assign")
            msg = `${r.data.placed} placed, ${r.data.moved} moved up, ${r.data.graduated} graduated`
          }, "Classes sorted")
          if (ok) {
            refresh()
            toast.message(msg)
          }
          return ok
        }}
      />
      {selected && (
        <>
          <ClassDialog key={`e-${selected.id}`} record={selected} open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} />
          <ClassDetail id={selected.id} canEdit={canManage} open={dialog === "view"} onOpenChange={(o) => !o && setDialog(null)} />
          <ConfirmDialog open={dialog === "delete"} onOpenChange={(o) => !o && setDialog(null)} title="Delete class"
            description={`Delete ${selected.name}? Its ${selected.pupils} pupils stay enrolled but without a class until you sort again.`}
            onConfirm={async () => { const ok = await runAction(() => del(`/sunday-school/classes/${selected.id}`), "Class deleted"); if (ok) refresh(); return ok }} />
        </>
      )}
    </Page>
  )
}

export function ClassDetail({ id, canEdit, open, onOpenChange }: { id: string; canEdit: boolean; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: c } = useApi<SundaySchoolClass>(open ? `/sunday-school/classes/${id}` : null)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {!c ? (<><DialogTitle className="sr-only">Loading</DialogTitle><div className="h-60 animate-pulse rounded-xl bg-muted" /></>) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">{c.name}</DialogTitle>
              <DialogDescription>
                Ages {c.minAge}–{c.maxAge}{c.room ? ` · ${c.room}` : ""} · {c.pupils} pupils
                {c.teachers.length ? ` · taught by ${c.teachers.map((t) => t.name).join(", ")}` : ""}
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="register" className="gap-4">
              <TabsList>
                <TabsTrigger value="register"><GraduationCap className="size-4" /> Register</TabsTrigger>
                <TabsTrigger value="pupils"><Users className="size-4" /> Pupils & parents</TabsTrigger>
              </TabsList>
              <TabsContent value="register">
                <ClassRegister classId={c.id} pupils={c.pupilList ?? []} canEdit={canEdit} />
              </TabsContent>
              <TabsContent value="pupils">
                <ul className="divide-y rounded-xl border">
                  {c.pupilList?.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                      <PersonAvatar name={p.name} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{p.name} <span className="font-normal text-muted-foreground">· {p.age ?? "?"} yrs</span></p>
                        <p className="text-xs text-muted-foreground">
                          {p.parent ? `Parent: ${p.parent}` : "No parent recorded"} · came {p.attended} of last {c.recentSundays ?? 0} Sundays
                        </p>
                      </div>
                      {p.parentPhone && <Button variant="outline" size="sm" asChild><a href={`tel:${p.parentPhone}`}><Phone className="size-4" /> Parent</a></Button>}
                    </li>
                  ))}
                  {!c.pupilList?.length && <li className="p-4 text-sm text-muted-foreground">No pupils yet.</li>}
                </ul>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ClassDialog({ record, open, onOpenChange }: { record?: SundaySchoolClass; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const body = { name: str(fd, "name"), minAge: num(fd, "minAge"), maxAge: num(fd, "maxAge"), room: str(fd, "room"), description: str(fd, "description") }
    if (record) await patch(`/sunday-school/classes/${record.id}`, body)
    else await post("/sunday-school/classes", body)
    refresh()
    onOpenChange(false)
  }, record ? "Class updated" : "Class created")
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{record ? `Edit ${record.name}` : "New class"}</DialogTitle><DialogDescription>Classes are matched to children by age.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2"><Label htmlFor="c-name">Name</Label><Input id="c-name" name="name" defaultValue={record?.name} placeholder="e.g. Juniors" required /><FieldError error={error} name="name" /></div>
          <div className="space-y-2"><Label htmlFor="c-min">From age</Label><Input id="c-min" name="minAge" type="number" min={0} max={12} defaultValue={record?.minAge ?? 0} required /></div>
          <div className="space-y-2"><Label htmlFor="c-max">To age</Label><Input id="c-max" name="maxAge" type="number" min={0} max={12} defaultValue={record?.maxAge ?? 12} required /><FieldError error={error} name="maxAge" /></div>
          <div className="col-span-2 space-y-2"><Label htmlFor="c-room"><DoorOpen className="inline size-3.5" /> Room</Label><Input id="c-room" name="room" defaultValue={record?.room ?? ""} /></div>
          <div className="col-span-2 space-y-2"><Label htmlFor="c-desc">Notes</Label><Textarea id="c-desc" name="description" rows={2} defaultValue={record?.description ?? ""} /></div>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save class"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
