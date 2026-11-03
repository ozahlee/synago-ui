"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FieldError, str, useApiForm } from "@/components/form"
import { MemberPicker } from "@/components/member-picker"
import { refreshMinistries } from "@/components/ministries-grid"
import { patch, post } from "@/lib/api"
import type { Ministry } from "@/lib/types"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

type MinistryFormDialogProps = {
  ministry?: Ministry
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MinistryFormDialog({ ministry, open, onOpenChange }: MinistryFormDialogProps) {
  const isEdit = !!ministry

  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const leaderId = str(fd, "leaderId")
    const body = {
      name: str(fd, "name"),
      description: str(fd, "description"),
      leaderId: leaderId ? Number(leaderId) : null,
      meetingDay: str(fd, "meetingDay"),
      meetingTime: str(fd, "meetingTime"),
      location: str(fd, "location"),
      status: str(fd, "status") ?? "active",
    }
    if (isEdit) await patch(`/ministries/${ministry.id}`, body)
    else await post("/ministries", body)
    refreshMinistries()
    onOpenChange(false)
  }, isEdit ? "Ministry updated" : "Ministry created")

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
          <DialogTitle>{isEdit ? "Edit Ministry" : "Add New Ministry"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update ministry details" : "Create a new ministry and assign a leader"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="min-name">Ministry Name</Label>
              <Input id="min-name" name="name" placeholder="e.g., Youth Ministry" defaultValue={ministry?.name} required />
              <FieldError error={error} name="name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-description">Description</Label>
              <Textarea
                id="min-description"
                name="description"
                placeholder="Describe the ministry's purpose and activities"
                rows={3}
                defaultValue={ministry?.description ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-leader">Ministry Leader</Label>
              <MemberPicker
                id="min-leader"
                name="leaderId"
                placeholder="Search for a member…"
                initial={ministry?.leaderId && ministry.leader ? { id: ministry.leaderId, name: ministry.leader } : null}
              />
              <FieldError error={error} name="leaderId" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-day">Meeting Day</Label>
                <Select name="meetingDay" defaultValue={ministry?.meetingDay ?? undefined}>
                  <SelectTrigger id="min-day">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-time">Meeting Time</Label>
                <Input id="min-time" name="meetingTime" type="time" defaultValue={ministry?.meetingTime ?? ""} />
                <FieldError error={error} name="meetingTime" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-location">Meeting Location</Label>
              <Input id="min-location" name="location" placeholder="e.g., Fellowship Hall" defaultValue={ministry?.location ?? ""} />
            </div>

            {isEdit && (
              <div className="space-y-2">
                <Label htmlFor="min-status">Status</Label>
                <Select name="status" defaultValue={ministry.status}>
                  <SelectTrigger id="min-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Ministry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
