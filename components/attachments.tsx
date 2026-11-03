"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { FileText, FileSpreadsheet, FileImage, File, Paperclip, Trash2, Upload, Presentation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { runAction } from "@/components/form"
import { API_URL, ApiError, del, getToken, openFile, qs, upload, useApi } from "@/lib/api"
import { cn } from "@/lib/utils"

export type AttachmentType = "sermon" | "guest" | "invitation" | "placement" | "collection" | "marriage" | "loan" | "project" | "requisition"
type Attachment = { id: string; label: string | null; name: string; mime: string; size: number; uploadedBy: string | null; uploadedAt: string | null }

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.jpg,.jpeg,.png,.webp,.txt"
const MAX = 10 * 1024 * 1024
const size = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`)
function iconFor(mime: string, name: string) {
  if (mime.startsWith("image/")) return FileImage
  if (/sheet|excel|\.xlsx?$/i.test(mime + name)) return FileSpreadsheet
  if (/presentation|powerpoint|\.pptx?$/i.test(mime + name)) return Presentation
  if (/pdf|word|document|text/i.test(mime)) return FileText
  return File
}

/**
 * Documents on a record: PDF, Word, Excel, images (up to 10 MB). Drag files in or pick them; open PDFs and
 * images in the browser, download the rest. Permissions follow the record (the server checks).
 */
export function Attachments({ type, id, canEdit, title = "Documents", hint, suggestions = [] }: {
  type: AttachmentType; id: string; canEdit: boolean; title?: string; hint?: string; suggestions?: string[]
}) {
  const key = qs("/attachments", { type, id })
  const { data, mutate } = useApi<Attachment[]>(key)
  const input = useRef<HTMLInputElement>(null)
  const [label, setLabel] = useState("")
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [removing, setRemoving] = useState<Attachment | null>(null)

  const send = async (files: FileList | File[]) => {
    const list = Array.from(files)
    if (!list.length) return
    setBusy(true)
    try {
      for (const f of list) {
        if (f.size > MAX) {
          toast.error(`${f.name} is larger than 10 MB`)
          continue
        }
        const form = new FormData()
        form.append("type", type)
        form.append("id", id)
        form.append("file", f)
        if (label.trim()) form.append("label", label.trim())
        await upload("/attachments", form)
      }
      toast.success(list.length === 1 ? "File attached" : `${list.length} files attached`)
      setLabel("")
      mutate()
    } catch (e) {
      toast.error(e instanceof ApiError ? (e.field("file") ?? e.message) : "Upload failed")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }
  const open = async (a: Attachment) => {
    try {
      await openFile(`/attachments/${a.id}/download`, a.name, a.mime === "application/pdf" || a.mime.startsWith("image/"))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the file")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Paperclip className="size-4" /> {title}{data && data.length > 0 && <span className="text-muted-foreground"> · {data.length}</span>}</h3>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>

      {!data ? <div className="h-14 animate-pulse rounded-xl bg-muted" /> : data.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {data.map((a) => {
            const Icon = iconFor(a.mime, a.name)
            return (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
                <button type="button" onClick={() => open(a)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-medium hover:underline">{a.label ?? a.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{a.label ? `${a.name} · ` : ""}{size(a.size)}{a.uploadedBy ? ` · ${a.uploadedBy}` : ""}{a.uploadedAt ? ` · ${new Date(a.uploadedAt).toLocaleDateString()}` : ""}</span>
                </button>
                {canEdit && <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setRemoving(a)} aria-label={`Remove ${a.name}`}><Trash2 className="size-4" /></Button>}
              </li>
            )
          })}
        </ul>
      )}

      {canEdit && (
        <div
          onDragOver={(e) => (e.preventDefault(), setDrag(true))}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => (e.preventDefault(), setDrag(false), send(e.dataTransfer.files))}
          className={cn("flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-3 transition", drag && "border-primary bg-primary/5")}
        >
          <Input aria-label="Label for the file" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={suggestions[0] ? `Label, e.g. ${suggestions[0]}` : "Label (optional)"} list={`att-${type}-${id}`} className="h-9 min-w-40 flex-1" />
          <datalist id={`att-${type}-${id}`}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
          <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => e.target.files && send(e.target.files)} />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}><Upload className="size-4" /> {busy ? "Uploading…" : "Attach files"}</Button>
          <span className="w-full text-[11px] text-muted-foreground">or drop them here · PDF, Word, Excel, PowerPoint, images · up to 10 MB each</span>
        </div>
      )}
      {!canEdit && data?.length === 0 && <p className="text-sm text-muted-foreground">No documents.</p>}

      {removing && (
        <ConfirmDialog open onOpenChange={(o) => !o && setRemoving(null)} title={`Remove ${removing.label ?? removing.name}?`} description="The file is deleted from the server." confirmLabel="Remove"
          onConfirm={async () => { const ok = await runAction(() => del(`/attachments/${removing.id}`), "File removed"); if (ok) mutate(); return ok }} />
      )}
    </div>
  )
}

/**
 * The record's photo (first image whose label matches, e.g. "Official wedding photo"), loaded with the
 * user's sign-in and shown from memory, since files aren't public. Returns null while loading or if there is none.
 */
export function useAttachmentImage(type: AttachmentType, id: string | null, label: RegExp = /photo/i) {
  const { data } = useApi<Attachment[]>(id ? qs("/attachments", { type, id }) : null)
  const photo = data?.find((a) => a.mime.startsWith("image/") && label.test(a.label ?? a.name)) ?? null
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!photo) return setUrl(null)
    let alive = true
    let made: string | null = null
    const token = getToken()
    fetch(`${API_URL}/attachments/${photo.id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => { if (b && alive) { made = URL.createObjectURL(b); setUrl(made) } })
      .catch(() => {})
    return () => { alive = false; if (made) URL.revokeObjectURL(made) }
  }, [photo?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return url
}
