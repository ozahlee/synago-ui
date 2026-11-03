"use client"

import { useState } from "react"
import { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { FieldError, bool, str, useApiForm } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { patch, post } from "@/lib/api"
import { ANNOUNCEMENT_META } from "@/lib/announcements"
import { ANNOUNCEMENT_TYPES, type Announcement, type AnnouncementType } from "@/lib/types"

export const refreshAnnouncements = () => mutate((key) => typeof key === "string" && key.startsWith("/announcements"))

type Props = { record?: Announcement; open: boolean; onOpenChange: (open: boolean) => void }

export function AnnouncementFormDialog({ record, open, onOpenChange }: Props) {
  const isEdit = !!record
  const [type, setType] = useState<AnnouncementType>(record?.type ?? "burial")
  const meta = ANNOUNCEMENT_META[type]

  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const memberId = str(fd, "memberId")
    const body = {
      type,
      title: str(fd, "title"),
      subject: str(fd, "subject"),
      details: str(fd, "details"),
      eventAt: str(fd, "eventAt"),
      venue: str(fd, "venue"),
      contactName: str(fd, "contactName"),
      contactPhone: str(fd, "contactPhone"),
      memberId: memberId ? Number(memberId) : null,
      pinned: bool(fd, "pinned"),
    }
    if (isEdit) await patch(`/announcements/${record.id}`, body)
    else await post("/announcements", body)
    refreshAnnouncements()
    onOpenChange(false)
  }, isEdit ? "Announcement updated" : "Announcement posted")

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit announcement" : "New announcement"}</DialogTitle>
          <DialogDescription>Shared with the congregation and read out in church. Everyone on staff can see it.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
            {ANNOUNCEMENT_TYPES.map((t) => {
              const m = ANNOUNCEMENT_META[t]
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  aria-pressed={type === t}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition ${
                    type === t ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20" : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <m.icon className="size-4" />
                  {m.label}
                </button>
              )
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="a-title">Heading</Label>
              <Input
                id="a-title"
                name="title"
                required
                defaultValue={record?.title}
                placeholder={type === "burial" ? "Burial arrangements" : type === "wedding" ? "Holy Matrimony" : "What is happening?"}
              />
              <FieldError error={error} name="title" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="a-subject">{meta.subjectLabel}</Label>
              <Input id="a-subject" name="subject" defaultValue={record?.subject ?? ""} placeholder={meta.subjectHint} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-when">Date & time</Label>
              <Input id="a-when" name="eventAt" type="datetime-local" defaultValue={record?.eventAt ?? ""} />
              <FieldError error={error} name="eventAt" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-venue">Venue</Label>
              <Input id="a-venue" name="venue" defaultValue={record?.venue ?? ""} placeholder={type === "burial" ? "Ancestral home, village…" : "Church hall"} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-contact">Contact person</Label>
              <Input id="a-contact" name="contactName" defaultValue={record?.contactName ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-phone">Contact phone</Label>
              <Input id="a-phone" name="contactPhone" type="tel" defaultValue={record?.contactPhone ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="a-member">Member concerned (optional)</Label>
              <MemberPicker
                id="a-member"
                name="memberId"
                placeholder="e.g. the bereaved member or the couple's family"
                initial={record?.memberId && record.memberName ? { id: record.memberId, name: record.memberName } : null}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="a-details">Details</Label>
              <Textarea
                id="a-details"
                name="details"
                rows={4}
                defaultValue={record?.details ?? ""}
                placeholder={type === "burial" ? "Vigil / prayers, requiem service, transport from church, contributions…" : ""}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border bg-secondary/40 px-4 py-3">
            <div>
              <Label htmlFor="a-pinned">Pin to the top</Label>
              <p className="text-xs text-muted-foreground">Keep it first on the list and the Sunday sheet</p>
            </div>
            <Switch id="a-pinned" name="pinned" defaultChecked={record?.pinned ?? type === "burial"} key={type} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Post announcement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
