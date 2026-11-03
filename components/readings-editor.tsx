"use client"

import { useState } from "react"
import { BookMarked } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MemberPicker } from "@/components/member-picker"
import { useSettings } from "@/lib/settings"
import { READING_LABELS, READING_SETS, type ReadingRole, type SermonReading } from "@/lib/types"

export type ReadingDraft = { role: ReadingRole; ref: string; readerMemberId: string | null; readerName: string }

/** Bible readings for a service, in the order the church's tradition uses, each with an optional reader. */
export function ReadingsEditor({ initial, onChange, error }: { initial?: SermonReading[]; onChange: (rows: ReadingDraft[]) => void; error?: (key: string) => string | undefined }) {
  const { denomination } = useSettings()
  const roles = READING_SETS[denomination === "anglican" ? "anglican" : "default"]
  // keep any saved role the current tradition doesn't list (e.g. a Gospel recorded before a change)
  const extra = (initial ?? []).map((r) => r.role).filter((r) => !roles.includes(r))
  const order = [...roles, ...extra]
  const [rows, setRows] = useState<ReadingDraft[]>(() => order.map((role) => {
    const r = initial?.find((x) => x.role === role)
    return { role, ref: r?.ref ?? "", readerMemberId: r?.readerMemberId ?? null, readerName: r && !r.readerMemberId ? (r.reader ?? "") : "" }
  }))
  const set = (i: number, patch: Partial<ReadingDraft>) => {
    const next = rows.map((r, k) => (k === i ? { ...r, ...patch } : r))
    setRows(next)
    onChange(next)
  }
  return (
    <fieldset className="space-y-2 rounded-xl border p-4">
      <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold"><BookMarked className="size-4" /> Readings</legend>
      <p className="text-xs text-muted-foreground">Leave a reading blank if it isn&apos;t used. Members who read get a reminder if the Bible readers reminder is on.</p>
      {rows.map((r, i) => {
        const filled = rows.slice(0, i).filter((x) => x.ref.trim()).length
        return (
          <div key={r.role} className="grid items-start gap-2 sm:grid-cols-[130px_1fr_1fr]">
            <Label htmlFor={`rd-${r.role}`} className="pt-2.5 text-sm">{READING_LABELS[r.role]}</Label>
            <div>
              <Input id={`rd-${r.role}`} value={r.ref} onChange={(e) => set(i, { ref: e.target.value })} placeholder={r.role === "psalm" ? "e.g. Psalm 23" : r.role === "gospel" ? "e.g. John 15:1-8" : "e.g. Isaiah 40:1-11"} />
              {error?.(`readings.${filled}.ref`) && r.ref && <p className="mt-1 text-xs text-destructive">{error(`readings.${filled}.ref`)}</p>}
            </div>
            <MemberPicker id={`rd-${r.role}-reader`} name={`reader-${r.role}`} freeTextName={`reader-${r.role}-name`} placeholder="Reader (member or name)"
              initial={r.readerMemberId ? { id: r.readerMemberId, name: initial?.find((x) => x.role === r.role)?.reader ?? "" } : null}
              initialText={r.readerName || undefined}
              onSelect={(m) => set(i, { readerMemberId: m?.id ?? null })} />
          </div>
        )
      })}
    </fieldset>
  )
}

/** The rows the API expects, reading free-text reader names from the form. */
export function readingsPayload(rows: ReadingDraft[], fd: FormData) {
  return rows.filter((r) => r.ref.trim()).map((r) => {
    const member = String(fd.get(`reader-${r.role}`) ?? "")
    const name = String(fd.get(`reader-${r.role}-name`) ?? "").trim()
    return { role: r.role, ref: r.ref.trim(), readerMemberId: member ? Number(member) : null, readerName: member ? null : name || null }
  })
}
