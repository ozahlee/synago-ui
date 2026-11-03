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

type Pupil = { id: string; name: string; age: number | null; parent?: string | null }

/** Tick who came to Sunday school on a given Sunday. Used by staff and by the class's own teachers. */
export function ClassRegister({ classId, pupils, canEdit }: { classId: string; pupils: Pupil[]; canEdit: boolean }) {
  const [day, setDay] = useState(lastSunday())
  const { data } = useApi<{ date: string; present: string[] }>(qs(`/sunday-school/classes/${classId}/attendance`, { date: day }))
  const [present, setPresent] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data) setPresent(new Set(data.present))
  }, [data])

  const dirty = data && (data.present.length !== present.size || data.present.some((id) => !present.has(id)))
  const toggle = (id: string) =>
    setPresent((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const save = async () => {
    setSaving(true)
    const ok = await runAction(() => put(`/sunday-school/classes/${classId}/attendance`, { date: day, present: [...present].map(Number) }), "Register saved")
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
        </div>
        <p className="text-sm text-muted-foreground tabular">
          <span className="font-semibold text-foreground">{present.size}</span> of {pupils.length} present
        </p>
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
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || !dirty}><Save className="size-4" /> {saving ? "Saving…" : "Save register"}</Button>
        </div>
      )}
    </div>
  )
}
