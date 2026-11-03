"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FieldError, num, str, useApiForm } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { refreshOffertory } from "@/components/offertory-table"
import { patch, post, useApi } from "@/lib/api"
import { CURRENCY, titleCase, today } from "@/lib/format"
import { OFFERTORY_CATEGORIES, PAYMENT_METHODS, type CellGroupIndex, type Offertory } from "@/lib/types"
import { useSettings } from "@/lib/settings"

const LAST_SERVICE_KEY = "synago.lastService"
const lastService = () => {
  try {
    return localStorage.getItem(LAST_SERVICE_KEY)
  } catch {
    return null
  }
}

type OffertoryFormDialogProps = {
  record?: Offertory
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OffertoryFormDialog({ record, open, onOpenChange }: OffertoryFormDialogProps) {
  const isEdit = !!record
  const { services } = useSettings()
  const initialService = record ? (record.service ?? "none") : (lastService() ?? services[0] ?? "none")

  const [fromCell, setFromCell] = useState(!!record?.cellGroupId && !record.memberId)
  const [cellId, setCellId] = useState(record?.cellGroupId ?? "none")
  const { data: cells } = useApi<CellGroupIndex>(open ? "/cell-groups" : null)

  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const memberId = str(fd, "memberId")
    const body = {
      memberId: fromCell ? null : memberId ? Number(memberId) : null,
      contributorName: fromCell || memberId ? null : str(fd, "contributorName"),
      cellGroupId: fromCell && cellId !== "none" ? Number(cellId) : null,
      service: str(fd, "service") === "none" ? null : str(fd, "service"),
      category: str(fd, "category"),
      amount: num(fd, "amount"),
      date: str(fd, "date"),
      paymentMethod: str(fd, "paymentMethod"),
      reference: str(fd, "reference"),
      notes: str(fd, "notes"),
    }
    if (isEdit) await patch(`/offertory/${record.id}`, body)
    else await post("/offertory", body)
    try {
      if (body.service) localStorage.setItem(LAST_SERVICE_KEY, body.service)
    } catch {
      /* storage unavailable */
    }
    refreshOffertory()
    onOpenChange(false)
  }, isEdit ? "Offering updated" : "Offering recorded")

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Offering" : "Record Offering"}</DialogTitle>
          <DialogDescription>
            Link the gift to a member, or type a name for visitors. Leave blank for anonymous.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="o-member">{fromCell ? "Cell group" : "Contributor"}</Label>
                <div className="flex rounded-full bg-secondary p-0.5 text-xs">
                  {[false, true].map((v) => (
                    <button key={String(v)} type="button" onClick={() => setFromCell(v)}
                      className={`rounded-full px-2.5 py-1 font-medium ${fromCell === v ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                      {v ? "A cell group" : "A person"}
                    </button>
                  ))}
                </div>
              </div>
              {fromCell ? (
                <Select value={cellId} onValueChange={setCellId}>
                  <SelectTrigger id="o-member" className="w-full"><SelectValue placeholder="Choose cell group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose…</SelectItem>
                    {cells?.groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <MemberPicker
                  id="o-member"
                  name="memberId"
                  freeTextName="contributorName"
                  placeholder="Search member or type a name…"
                  initial={record?.memberId ? { id: record.memberId, name: record.contributor } : null}
                  initialText={record && !record.memberId && !record.cellGroupId && record.contributor !== "Anonymous" ? record.contributor : undefined}
                />
              )}
              {fromCell && <p className="text-xs text-muted-foreground">For gifts a cell brings together, e.g. at harvest. It counts toward the cell&apos;s harvest target.</p>}
              <FieldError error={error} name="memberId" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="o-service">Service</Label>
              <Select name="service" defaultValue={services.includes(initialService) || initialService === "none" ? initialService : services[0]}>
                <SelectTrigger id="o-service" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {services.map((sv) => (
                    <SelectItem key={sv} value={sv}>
                      {sv}
                    </SelectItem>
                  ))}
                  <SelectItem value="none">Not service-specific</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="o-category">Category</Label>
              <Select name="category" defaultValue={record?.category} required>
                <SelectTrigger id="o-category">
                  <SelectValue placeholder="Select offering type" />
                </SelectTrigger>
                <SelectContent>
                  {OFFERTORY_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {titleCase(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError error={error} name="category" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="o-amount">Amount ({CURRENCY})</Label>
                <Input id="o-amount" name="amount" type="number" min="0.01" step="0.01" defaultValue={record?.amount} required />
                <FieldError error={error} name="amount" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="o-date">Date</Label>
                <Input id="o-date" name="date" type="date" defaultValue={record?.date ?? today()} max={today()} required />
                <FieldError error={error} name="date" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="o-method">Payment Method</Label>
              <Select name="paymentMethod" defaultValue={record?.paymentMethod ?? "Cash"} required>
                <SelectTrigger id="o-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="o-ref">Reference Number (optional)</Label>
              <Input id="o-ref" name="reference" placeholder="Auto-generated if left blank" defaultValue={record?.reference} />
              <FieldError error={error} name="reference" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="o-notes">Notes (optional)</Label>
              <Textarea id="o-notes" name="notes" rows={2} defaultValue={record?.notes ?? ""} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save Changes" : "Save Offering"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
