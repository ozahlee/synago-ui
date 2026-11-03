"use client"

import { useState } from "react"
import { Check, ClipboardCheck, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { refreshBaptisms } from "@/components/baptism-form-dialog"
import { ApiError, patch, put, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { CURRENCY, longDate, money } from "@/lib/format"
import type { Baptism } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Tick off what a candidate has brought / paid. Fees are booked to Accounts as "Sacrament fees". */
export function RequirementsDialog({ id, open, onOpenChange }: { id: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { can } = useAuth()
  const canEdit = can("members.manage")
  const { data: b, mutate } = useApi<Baptism>(open ? `/baptisms/${id}` : null)
  const [busy, setBusy] = useState<string | null>(null)
  const [fees, setFees] = useState<Record<string, string>>({})

  const mark = async (key: string, done: boolean, amount?: number) => {
    setBusy(key)
    try {
      const res = await put<{ data: Baptism }>(`/baptisms/${id}/requirements/${key}`, { done, amount: amount ?? null })
      mutate(res, false)
      refreshBaptisms()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update")
    } finally {
      setBusy(null)
    }
  }

  const done = b?.requirements.filter((r) => r.done).length ?? 0
  const total = b?.requirements.length ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        {!b ? (<><DialogTitle className="sr-only">Loading</DialogTitle><div className="h-60 animate-pulse rounded-xl bg-muted" /></>) : (
          <>
            <DialogHeader>
              <DialogTitle>Requirements for {b.name}</DialogTitle>
              <DialogDescription>{done} of {total} done. Everything must be ticked before the {b.kind} can be recorded.</DialogDescription>
            </DialogHeader>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-all", done === total ? "bg-success" : "bg-primary")} style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
            <ul className="space-y-2">
              {b.requirements.map((r) => (
                <li key={r.key} className={cn("rounded-xl border p-3", r.done && "border-success/30 bg-success/5")}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={!canEdit || busy === r.key || (r.fee !== null && !r.done && !(Number(fees[r.key] ?? r.fee) > 0))}
                      onClick={() => mark(r.key, !r.done, r.fee !== null && !r.done ? Number(fees[r.key] ?? r.fee) : undefined)}
                      aria-label={r.done ? `Untick ${r.label}` : `Tick ${r.label}`}
                      className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition", r.done ? "border-success bg-success text-white" : "hover:border-primary")}
                    >
                      {r.done && <Check className="size-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{r.label}</p>
                      {r.done && (r.by || r.amount) && (
                        <p className="text-xs text-muted-foreground">
                          {r.amount ? `${money(r.amount)} paid` : "Verified"}{r.by ? ` by ${r.by}` : ""}{r.at ? ` · ${longDate(r.at)}` : ""}
                          {r.reference && <span className="font-mono"> · {r.reference}</span>}
                        </p>
                      )}
                    </div>
                    {r.fee !== null && !r.done && canEdit && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{CURRENCY}</span>
                        <Input type="number" min="0" step="0.01" className="h-8 w-28 text-right tabular" value={fees[r.key] ?? String(r.fee)}
                          onChange={(e) => setFees((f) => ({ ...f, [r.key]: e.target.value }))} aria-label={`${r.label} amount`} />
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {total === 0 && <li className="rounded-xl border p-4 text-sm text-muted-foreground">No requirements are set for this rite. Add them under Church settings.</li>}
            </ul>
            {b.overrideReason && <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs">Completed with requirements outstanding: {b.overrideReason}</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Try to mark the candidate completed; if requirements are missing, explain and (for pastors/admins) allow an override. */
export function useCompleteCandidate(onDone: () => void) {
  const { can } = useAuth()
  const [blocked, setBlocked] = useState<{ b: Baptism; message: string } | null>(null)

  const complete = async (b: Baptism, label: string) => {
    try {
      await patch(`/baptisms/${b.id}`, { status: "completed" })
      toast.success(label)
      onDone()
    } catch (e) {
      if (e instanceof ApiError && e.field("requirements")) setBlocked({ b, message: e.field("requirements")! })
      else toast.error(e instanceof Error ? e.message : "Couldn't complete")
    }
  }

  const dialog = blocked && (
    <OverrideDialog
      b={blocked.b}
      message={blocked.message}
      canOverride={can("sacraments.override")}
      onClose={() => setBlocked(null)}
      onDone={() => {
        setBlocked(null)
        onDone()
      }}
    />
  )
  return { complete, dialog }
}

function OverrideDialog({ b, message, canOverride, onClose, onDone }: { b: Baptism; message: string; canOverride: boolean; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("")
  const [pending, setPending] = useState(false)
  const [checklist, setChecklist] = useState(false)
  const override = async () => {
    setPending(true)
    try {
      await patch(`/baptisms/${b.id}`, { status: "completed", overrideReason: reason })
      toast.success(`${b.name} recorded (override noted)`)
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't complete")
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-10 items-center justify-center rounded-full bg-warning/15"><ShieldAlert className="size-5 text-warning" /></span>
              <DialogTitle>{b.name} isn&apos;t ready yet</DialogTitle>
            </div>
            <DialogDescription>{message.replace(" Give a reason to override.", "")}</DialogDescription>
          </DialogHeader>
          {canOverride && (
            <div className="space-y-2">
              <Label htmlFor="ov-r">Complete anyway, because…</Label>
              <Textarea id="ov-r" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Bishop's visit; books to follow next week" />
              <p className="text-xs text-muted-foreground">The reason is kept on the record.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setChecklist(true)}><ClipboardCheck className="size-4" /> Open checklist</Button>
            {canOverride && <Button onClick={override} disabled={pending || reason.trim().length < 3}>{pending ? "Saving…" : "Complete with reason"}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RequirementsDialog id={b.id} open={checklist} onOpenChange={(o) => { setChecklist(o); if (!o) onClose() }} />
    </>
  )
}
