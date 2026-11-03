"use client"

import { useState } from "react"
import { BookOpen, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { api, qs } from "@/lib/api"

/**
 * Type references any way ("Jn 15 1-8", "1cor 13") and press Enter / comma / semicolon:
 * each is checked and tidied ("John 15:1–8") before it becomes a chip.
 */
export function ScriptureInput({ value, onChange, id }: { value: string[]; onChange: (v: string[]) => void; id?: string }) {
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const add = async (raw: string) => {
    const parts = raw.split(/[;\n]+/).map((p) => p.trim()).filter(Boolean)
    if (!parts.length) return
    setBusy(true)
    const next = [...value]
    const bad: string[] = []
    for (const p of parts) {
      try {
        const r = await api<{ data: { ref: string } | null }>(qs("/scripture/parse", { ref: p }))
        if (r.data) {
          if (!next.includes(r.data.ref)) next.push(r.data.ref)
        } else bad.push(p)
      } catch {
        bad.push(p)
      }
    }
    setBusy(false)
    onChange(next)
    setText(bad.join("; "))
    setError(bad.length ? `Couldn't read “${bad.join("”, “")}”. Try e.g. John 15:1-8 or 1 Cor 13.` : null)
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        {value.map((ref, i) => (
          <span key={ref} className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2.5 pr-1 text-sm font-medium text-primary">
            {i === 0 && <BookOpen className="size-3.5" />}
            {ref}
            <button type="button" aria-label={`Remove ${ref}`} className="rounded-full p-0.5 hover:bg-primary/15" onClick={() => onChange(value.filter((x) => x !== ref))}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        <Input
          id={id}
          value={text}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ";") {
              e.preventDefault()
              add(text)
            } else if (e.key === "Backspace" && !text && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => text.trim() && add(text)}
          placeholder={value.length ? "Add another…" : "e.g. Jn 15 1-8; Gal 5:22-23"}
          className="h-7 min-w-40 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : <p className="text-xs text-muted-foreground">Press Enter after each passage. The first is the main text.</p>}
    </div>
  )
}
