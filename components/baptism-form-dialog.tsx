"use client"

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
import { today } from "@/lib/format"
import { defaultMode, ritesFor, useSettings } from "@/lib/settings"
import type { Baptism, RiteKind } from "@/lib/types"

export const refreshBaptisms = () => mutate((key) => typeof key === "string" && key.startsWith("/baptisms"))

type Props = {
  record?: Baptism
  defaultKind?: RiteKind
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BaptismFormDialog({ record, defaultKind, open, onOpenChange }: Props) {
  const isEdit = !!record
  const settings = useSettings()
  const rites = ritesFor(settings.denomination)

  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const memberId = str(fd, "memberId")
    const body = {
      memberId: memberId ? Number(memberId) : null,
      name: memberId ? null : str(fd, "name"),
      kind: str(fd, "kind"),
      status: str(fd, "status"),
      date: str(fd, "date"),
      gender: str(fd, "gender"),
      dateOfBirth: str(fd, "dateOfBirth"),
      mode: str(fd, "mode"),
      officiant: str(fd, "officiant"),
      place: str(fd, "place"),
      fatherName: str(fd, "fatherName"),
      motherName: str(fd, "motherName"),
      sponsors: str(fd, "sponsors"),
      classCompleted: bool(fd, "classCompleted"),
      certificateNumber: str(fd, "certificateNumber"),
      notes: str(fd, "notes"),
    }
    if (isEdit) await patch(`/baptisms/${record.id}`, body)
    else await post("/baptisms", body)
    refreshBaptisms()
    onOpenChange(false)
  }, isEdit ? "Record updated" : "Added to the register")

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
          <DialogTitle>{isEdit ? `Edit ${record.name}` : "Register a candidate"}</DialogTitle>
          <DialogDescription>
            Pick an existing member or type the candidate&apos;s name (e.g. an infant). Mark it completed once the service
            is done to issue a certificate number.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="b-name">Candidate</Label>
              <MemberPicker
                id="b-name"
                name="memberId"
                freeTextName="name"
                placeholder="Search a member or type the full name…"
                initial={record?.memberId ? { id: record.memberId, name: record.name } : null}
                initialText={record && !record.memberId ? record.name : undefined}
              />
              <FieldError error={error} name="name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="b-kind">Rite</Label>
              <Select name="kind" defaultValue={record?.kind ?? defaultKind ?? rites[0].kind}>
                <SelectTrigger id="b-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rites.map((r) => (
                    <SelectItem key={r.kind} value={r.kind}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-status">Status</Label>
              <Select name="status" defaultValue={record?.status ?? "scheduled"}>
                <SelectTrigger id="b-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Candidate (planned)</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="b-date">Service date</Label>
              <Input id="b-date" name="date" type="date" defaultValue={record?.date ?? today()} required />
              <FieldError error={error} name="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-mode">Mode</Label>
              <Select name="mode" defaultValue={record?.mode ?? defaultMode(settings.denomination)}>
                <SelectTrigger id="b-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sprinkling">Sprinkling</SelectItem>
                  <SelectItem value="pouring">Pouring</SelectItem>
                  <SelectItem value="immersion">Immersion</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-xl border bg-secondary/40 px-4 py-3 sm:col-span-2">
              <div>
                <Label htmlFor="b-class">Attended preparation class</Label>
                <p className="text-xs text-muted-foreground">Baptism / confirmation class or parents&apos; instruction</p>
              </div>
              <Switch id="b-class" name="classCompleted" defaultChecked={record?.classCompleted ?? false} />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Candidate details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="b-gender">Gender</Label>
                <Select name="gender" defaultValue={record?.gender ?? undefined}>
                  <SelectTrigger id="b-gender" className="w-full">
                    <SelectValue placeholder="From member record" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-dob">Date of birth</Label>
                <Input id="b-dob" name="dateOfBirth" type="date" max={today()} defaultValue={record?.dateOfBirth ?? ""} />
                <FieldError error={error} name="dateOfBirth" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-father">Father&apos;s name</Label>
                <Input id="b-father" name="fatherName" defaultValue={record?.fatherName ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-mother">Mother&apos;s name</Label>
                <Input id="b-mother" name="motherName" defaultValue={record?.motherName ?? ""} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="b-sponsors">Godparents / sponsors</Label>
                <Input id="b-sponsors" name="sponsors" placeholder="Separate names with commas" defaultValue={record?.sponsors ?? ""} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Service</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="b-officiant">Officiating minister</Label>
                <Input id="b-officiant" name="officiant" placeholder="e.g. Rev. Canon John Okello" defaultValue={record?.officiant ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-place">Place</Label>
                <Input id="b-place" name="place" defaultValue={record?.place ?? settings.churchName} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-cert">Certificate no.</Label>
                <Input id="b-cert" name="certificateNumber" placeholder="Issued automatically" defaultValue={record?.certificateNumber ?? ""} />
                <FieldError error={error} name="certificateNumber" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="b-notes">Notes</Label>
                <Textarea id="b-notes" name="notes" rows={2} defaultValue={record?.notes ?? ""} />
              </div>
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add to register"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
