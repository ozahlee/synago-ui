"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { FieldError, bool, str, useApiForm } from "@/components/form"
import { refreshMembers } from "@/components/members-table"
import { patch, post, useApi } from "@/lib/api"
import { today } from "@/lib/format"
import type { CellGroupIndex, Member, Ministry, SundaySchoolIndex } from "@/lib/types"
import { HouseholdPicker } from "@/components/households-content"
import { MemberPicker } from "@/components/member-picker"

type MemberFormDialogProps = {
  /** Omit to create a new member */
  member?: Member
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MemberFormDialog({ member, open, onOpenChange }: MemberFormDialogProps) {
  const isEdit = !!member
  const { data: ministries = [] } = useApi<Ministry[]>(open ? "/ministries" : null)
  const primary = member?.ministries.find((m) => m.isPrimary) ?? member?.ministries[0]
  const [ministryId, setMinistryId] = useState(primary?.id ?? "none")
  const { data: cells } = useApi<CellGroupIndex>(open ? "/cell-groups" : null)
  const { data: school } = useApi<SundaySchoolIndex>(open ? "/sunday-school/classes" : null)
  const [cellId, setCellId] = useState(member?.cellGroupId ?? "none")
  const [classId, setClassId] = useState(member?.sundaySchoolClassId ?? "auto")

  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const body = {
      pledgeNumber: str(fd, "pledgeNumber"),
      name: str(fd, "name"),
      email: str(fd, "email"),
      phone: str(fd, "phone"),
      gender: str(fd, "gender"),
      dateOfBirth: str(fd, "dateOfBirth"),
      dateJoined: str(fd, "dateJoined"),
      status: str(fd, "status") ?? "active",
      address: str(fd, "address"),
      village: str(fd, "village"),
      parish: str(fd, "parish"),
      subCounty: str(fd, "subCounty"),
      sundaySchool: bool(fd, "sundaySchool"),
      cellGroupId: cellId === "none" ? null : Number(cellId),
      householdId: str(fd, "householdId") ? Number(str(fd, "householdId")) : null,
      ...(classId === "auto" ? {} : { sundaySchoolClassId: classId === "none" ? null : Number(classId) }),
      nextOfKinMemberId: str(fd, "nextOfKinMemberId") ? Number(str(fd, "nextOfKinMemberId")) : null,
      nextOfKinName: str(fd, "nextOfKinMemberId") ? null : str(fd, "nextOfKinName"),
      nextOfKinRelationship: str(fd, "nextOfKinRelationship"),
      nextOfKinPhone: str(fd, "nextOfKinPhone"),
      // Keep the member's other ministries; just change which one is primary.
      ministryIds:
        ministryId === "none"
          ? []
          : Array.from(new Set([...(member?.ministries.map((m) => Number(m.id)) ?? []), Number(ministryId)])),
      primaryMinistryId: ministryId === "none" ? null : Number(ministryId),
    }
    if (isEdit) await patch(`/members/${member.id}`, body)
    else await post("/members", body)
    refreshMembers()
    onOpenChange(false)
  }, isEdit ? "Member updated" : "Member added")

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Member" : "Add New Member"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update the member's information" : "Enter the details of the new church member"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_11rem]">
              <div className="space-y-2">
                <Label htmlFor="m-name">Full Name</Label>
                <Input id="m-name" name="name" placeholder="John Mensah" defaultValue={member?.name} required />
                <FieldError error={error} name="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-pledge">Pledge no.</Label>
                <Input id="m-pledge" name="pledgeNumber" placeholder="Auto" defaultValue={member?.pledgeNumber ?? ""} className="font-mono" />
                <FieldError error={error} name="pledgeNumber" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="m-email">Email (optional)</Label>
                <Input id="m-email" name="email" type="email" defaultValue={member?.email ?? ""} />
                <FieldError error={error} name="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-phone">Phone Number</Label>
                <Input id="m-phone" name="phone" type="tel" placeholder="+256 7xx xxx xxx" defaultValue={member?.phone ?? ""} />
                <FieldError error={error} name="phone" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="m-gender">Gender</Label>
                <Select name="gender" defaultValue={member?.gender} required>
                  <SelectTrigger id="m-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError error={error} name="gender" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-dob">Date of Birth</Label>
                <Input id="m-dob" name="dateOfBirth" type="date" defaultValue={member?.dateOfBirth ?? ""} max={today()} />
                <FieldError error={error} name="dateOfBirth" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-joined">Date Joined</Label>
                <Input id="m-joined" name="dateJoined" type="date" defaultValue={member?.dateJoined ?? today()} required />
                <FieldError error={error} name="dateJoined" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="m-address">Address</Label>
              <Input id="m-address" name="address" placeholder="Plot 12, Main Street" defaultValue={member?.address ?? ""} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="m-village">Village/Zone</Label>
                <Input id="m-village" name="village" defaultValue={member?.village ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-parish">Parish</Label>
                <Input id="m-parish" name="parish" defaultValue={member?.parish ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-subcounty">Sub County</Label>
                <Input id="m-subcounty" name="subCounty" defaultValue={member?.subCounty ?? ""} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="m-ministry">{isEdit ? "Primary Ministry" : "Ministry"}</Label>
                <Select value={ministryId} onValueChange={setMinistryId}>
                  <SelectTrigger id="m-ministry">
                    <SelectValue placeholder="Select ministry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {ministries.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="m-status">Status</Label>
                  <Select name="status" defaultValue={member.status}>
                    <SelectTrigger id="m-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      {member.status === "deceased" && <SelectItem value="deceased">Deceased</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="m-cell">Cell group</Label>
              <Select value={cellId} onValueChange={setCellId}>
                <SelectTrigger id="m-cell" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not in a cell group</SelectItem>
                  {cells?.groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="m-household">Family</Label>
              <HouseholdPicker id="m-household" name="householdId" initial={member?.householdId && member.household ? { id: member.householdId, name: member.household } : null} />
            </div>

            <fieldset className="space-y-3 rounded-xl border p-4">
              <legend className="px-1 text-sm font-medium">Next of kin</legend>
              <div className="space-y-2">
                <Label htmlFor="m-nok">Name</Label>
                <MemberPicker
                  id="m-nok"
                  name="nextOfKinMemberId"
                  freeTextName="nextOfKinName"
                  placeholder="A member, or type any name"
                  initial={member?.nextOfKin?.memberId && member.nextOfKin.name ? { id: member.nextOfKin.memberId, name: member.nextOfKin.name } : null}
                  initialText={member?.nextOfKin && !member.nextOfKin.memberId ? (member.nextOfKin.name ?? undefined) : undefined}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="m-nok-rel">Relationship</Label>
                  <Input id="m-nok-rel" name="nextOfKinRelationship" list="nok-rel" defaultValue={member?.nextOfKin?.relationship ?? ""} placeholder="Mother, husband, son…" />
                  <datalist id="nok-rel">{["Mother", "Father", "Husband", "Wife", "Son", "Daughter", "Brother", "Sister", "Guardian"].map((r) => <option key={r} value={r} />)}</datalist>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-nok-phone">Phone (if not a member)</Label>
                  <Input id="m-nok-phone" name="nextOfKinPhone" type="tel" defaultValue={member?.nextOfKin && !member.nextOfKin.memberId ? (member.nextOfKin.phone ?? "") : ""} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">For children, put the parent here. The Sunday school teacher sees this contact.</p>
            </fieldset>

            <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-[1fr_14rem] sm:items-center">
              <div className="flex items-center justify-between gap-4 sm:justify-start">
                <div className="space-y-0.5">
                  <Label htmlFor="m-ss">Sunday school</Label>
                  <p className="text-xs text-muted-foreground">Children 12 and under are enrolled automatically, in the class for their age.</p>
                </div>
                <Switch id="m-ss" name="sundaySchool" defaultChecked={member?.sundaySchool} />
              </div>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger aria-label="Sunday school class" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Class: by age (automatic)</SelectItem>
                  <SelectItem value="none">No class</SelectItem>
                  {school?.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.minAge}–{c.maxAge})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save Changes" : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
