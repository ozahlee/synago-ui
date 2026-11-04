"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Camera, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api, upload } from "@/lib/api"
import { cn } from "@/lib/utils"

/** "Add / change photo" for a member: any photo; the server crops it to a passport photo. */
export function PhotoUpload({ memberId, hasPhoto, onChange, className, compact }: { memberId: string; hasPhoto: boolean; onChange: (url: string | null) => void; className?: string; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const send = async (file: File) => {
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append("photo", file)
      const r = await upload<{ data: { photoUrl: string } }>(`/members/${memberId}/photo`, fd)
      onChange(r.data.photoUrl)
      toast.success("Photo saved")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save the photo") }
    setBusy(false)
  }
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) send(f) }} />
      <Button type="button" size="sm" variant={compact ? "ghost" : "secondary"} className={cn(compact && "h-7 px-2 text-xs")} disabled={busy} onClick={() => input.current?.click()}>
        <Camera className="size-3.5" /> {busy ? "Saving…" : hasPhoto ? "Change photo" : "Add photo"}
      </Button>
      {hasPhoto && !compact && (
        <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Remove photo" disabled={busy}
          onClick={async () => { try { await api(`/members/${memberId}/photo`, { method: "DELETE" }); onChange(null); toast.success("Photo removed") } catch { toast.error("Could not remove the photo") } }}>
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </span>
  )
}
