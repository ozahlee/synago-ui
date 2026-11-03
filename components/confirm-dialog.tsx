"use client"

import { useState } from "react"
import { AlertTriangle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel?: string
  /** Return false to keep the dialog open (e.g. the action failed). */
  onConfirm: () => Promise<boolean | void>
  /** "default" for safe, constructive actions (no red warning styling). */
  tone?: "destructive" | "default"
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Delete", onConfirm, tone = "destructive" }: ConfirmDialogProps) {
  const [pending, setPending] = useState(false)

  const confirm = async () => {
    setPending(true)
    const ok = await onConfirm().finally(() => setPending(false))
    if (ok !== false) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {tone === "destructive" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant={tone === "destructive" ? "destructive" : "default"} onClick={confirm} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
