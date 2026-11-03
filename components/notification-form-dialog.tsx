"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { FieldError, bool, str, useApiForm } from "@/components/form"
import { refreshNotifications } from "@/components/notifications-content"
import { post } from "@/lib/api"

export function NotificationFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    await post("/notifications", {
      type: str(fd, "type") ?? "info",
      title: str(fd, "title"),
      message: str(fd, "message"),
      important: bool(fd, "important"),
    })
    refreshNotifications()
    onOpenChange(false)
  }, "Notification sent to all staff")

  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Notification</DialogTitle>
          <DialogDescription>Posts an announcement to every staff member&apos;s notifications.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="n-type">Type</Label>
              <Select name="type" defaultValue="info">
                <SelectTrigger id="n-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Announcement / Info</SelectItem>
                  <SelectItem value="success">Good news</SelectItem>
                  <SelectItem value="warning">Reminder / Warning</SelectItem>
                  <SelectItem value="error">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="n-title">Title</Label>
              <Input id="n-title" name="title" required />
              <FieldError error={error} name="title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n-message">Message</Label>
              <Textarea id="n-message" name="message" rows={4} required />
              <FieldError error={error} name="message" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="n-important" className="text-sm">
                Mark Important
              </Label>
              <Switch id="n-important" name="important" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send Notification"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
