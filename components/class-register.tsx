"use client"

import { useEffect, useState } from "react"
import { mutate } from "swr"
import { Check, ChevronLeft, ChevronRight, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PersonAvatar } from "@/components/page"
import { runAction } from "@/components/form"
import { put, qs, useApi } from "@/lib/api"
import { lastSunday, shiftDays, today } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useSettings } from "@/lib/settings"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SundaySchoolRegister } from "@/lib/types"

type Pupil = { id: string; name: string; age: number | null; parent?: string | null; gender?: string | null }

/**
 * Tick who came to Sunday school on a Sunday, in a service. Boys and girls are counted from the ticks,
 * plus children who came but are not on the roll. Used by staff and by the class's own teachers.
 */
export function ClassRegister({ classId, pupils, canEdit, usualService }: { classId: string; pupils: Pupil[]; canEdit: boolean; usualService?: string | null }) {
  const { services } = useSettings()
  const [day, setDay] = useState(lastSunday())
  const [service, setService] = useState(usualService || services[0] || "First Service")
  const { data } = useApi<SundaySchoolRegister>(qs(`/sunday-school/classes/${classId}/attendance`, { date: day, service }))
  const [present, setPresent] = useState<Set<string>>(new Set())
  const [extra, setExtra] = useState({ boys: 0, girls: 0 })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data) (setPresent(new Set(data.present)), setExtra({ boys: data.visitingBoys, girls: data.visitingGirls }))
  }, [data])

  const ticked = pupils.filter((p) => present.has(p.id))
  const boys = ticked.filter((p) => p.gender === "male").length + extra.boys
  const girls = ticked.filter((p) => p.gender === "female").length + extra.girls
  const total = present.size + extra.boys + extra.girls
  const dirty = data && (data.present.length !== present.size || data.present.some((id) => !present.has(id)) || data.visitingBoys !== extra.boys || data.visitingGirls !== extra.girls)
  const toggle = (id: string) =>
    setPresent((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const save = async () => {
    setSaving(true)
    const ok = await runAction(() => put(`/sunday-school/classes/${classId}/attendance`, { date: day, service, present: [...present].map(Number), visitingBoys: extra.boys, visitingGirls: extra.girls }), `Register saved for ${service}`)
    setSaving(false)
    if (ok) mutate((k) => typeof k === "string" && k.startsWith("/sunday-school"))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" aria-label="Previous week" onClick={() => setDay(shiftDays(day, -7))}><ChevronLeft className="size-4" /></Button>
          <Input type="date" value={day} max={today()} onChange={(e) => e.target.value && setDay(e.target.value)} className="h-9 w-40" aria-label="Sunday" />
          <Button variant="outline" size="icon-sm" aria-label="Next week" disabled={shiftDays(day, 7) > today()} onClick={() => setDay(shiftDays(day, 7))}><ChevronRight className="size-4" /></Button>
          <Select value={service} onValueChange={(v) => v && setService(v)}>
            <SelectTrigger size="sm" className="ml-1 h-9 w-40" aria-label="Service"><SelectValue /></SelectTrigger>
            <SelectContent>{services.map((s) => <SelectItem key={s} value={s}>{s}{data?.services.includes(s) && s !== service ? " ✓" : ""}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground tabular">
          <span className="font-semibold text-foreground">{present.size}</span> of {pupils.length} on the roll
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-secondary/60 p-2"><p className="text-xl font-semibold tabular">{boys}</p><p className="text-xs text-muted-foreground">boys</p></div>
        <div className="rounded-xl bg-secondary/60 p-2"><p className="text-xl font-semibold tabular">{girls}</p><p className="text-xs text-muted-foreground">girls</p></div>
        <div className="rounded-xl bg-primary/10 p-2"><p className="text-xl font-semibold tabular text-primary">{total}</p><p className="text-xs text-muted-foreground">in {service.replace(" Service", "")}</p></div>
      </div>
      {pupils.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">No pupils in this class yet.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {pupils.map((p) => {
            const on = present.has(p.id)
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggle(p.id)}
                  className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition", on ? "border-success/40 bg-success/5" : "hover:bg-accent")}
                >
                  <PersonAvatar name={p.name} className="size-8" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{[p.age !== null ? `${p.age} yrs` : null, p.parent].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className={cn("flex size-6 items-center justify-center rounded-full border", on && "border-success bg-success text-white")}>{on && <Check className="size-3.5" />}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-secondary/30 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Not on the roll (visiting children):</span>
        <label className="flex items-center gap-1.5">Boys <Input type="number" min={0} disabled={!canEdit} value={extra.boys || ""} placeholder="0" onChange={(e) => setExtra({ ...extra, boys: Math.max(0, Number(e.target.value) || 0) })} className="h-8 w-16 text-center tabular" /></label>
        <label className="flex items-center gap-1.5">Girls <Input type="number" min={0} disabled={!canEdit} value={extra.girls || ""} placeholder="0" onChange={(e) => setExtra({ ...extra, girls: Math.max(0, Number(e.target.value) || 0) })} className="h-8 w-16 text-center tabular" /></label>
      </div>
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || !dirty}><Save className="size-4" /> {saving ? "Saving…" : "Save register"}</Button>
        </div>
      )}
    </div>
  )
}
