"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { qs, usePaginated } from "@/lib/api"
import type { Member } from "@/lib/types"
import { cn } from "@/lib/utils"

type MemberPickerProps = {
  id?: string
  /** Hidden input name that receives the selected member id */
  name: string
  placeholder?: string
  initial?: { id: string; name: string } | null
  /** Pre-filled free text when no member is linked (e.g. a visitor name being edited) */
  initialText?: string
  /** Lets the user keep free text (e.g. a visitor's name) when no member is picked; submitted as `${freeTextName}`. */
  freeTextName?: string
  onSelect?: (member: Member | null) => void
}

/** Search-as-you-type member selector backed by GET /members?search=. */
export function MemberPicker({ id, name, placeholder = "Search members…", initial, initialText, freeTextName, onSelect }: MemberPickerProps) {
  const [query, setQuery] = useState(initial?.name ?? initialText ?? "")
  const [debounced, setDebounced] = useState("")
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(initial ?? null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const { rows, isLoading } = usePaginated<Member>(
    open && debounced.length >= 2 ? qs("/members", { search: debounced, perPage: 8 }) : null,
  )

  const pick = (m: Member) => {
    setSelected({ id: m.id, name: m.name })
    setQuery(m.name)
    setOpen(false)
    onSelect?.(m)
  }

  return (
    <div className="relative">
      <Input
        id={id}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (selected) {
            setSelected(null)
            onSelect?.(null)
          }
        }}
      />
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {freeTextName && <input type="hidden" name={freeTextName} value={selected ? "" : query} />}
      {open && debounced.length >= 2 && !selected && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
          {isLoading && <p className="px-2 py-1.5 text-sm text-muted-foreground">Searching…</p>}
          {!isLoading && rows.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              No members found{freeTextName ? " — the name will be saved as typed" : ""}
            </p>
          )}
          {rows.map((m) => (
            <button
              type="button"
              key={m.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(m)}
              className={cn("flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent")}
            >
              <span className="flex w-full items-center justify-between gap-2 font-medium">
                {m.name}
                {m.pledgeNumber && <span className="font-mono text-xs text-muted-foreground">{m.pledgeNumber}</span>}
              </span>
              <span className="text-xs text-muted-foreground">{m.phone ?? m.email ?? m.ministry ?? ""}</span>
            </button>
          ))}
        </div>
      )}
      {selected && <p className="mt-1 text-xs text-muted-foreground">Linked to member #{selected.id}</p>}
    </div>
  )
}
