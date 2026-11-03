"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PersonAvatar } from "@/components/page"
import { Users, Calendar, MapPin, X, Plus } from "lucide-react"
import { MemberPicker } from "@/components/member-picker"
import { refreshMinistries } from "@/components/ministries-grid"
import { runAction, str, useApiForm } from "@/components/form"
import { del, post, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { longDate } from "@/lib/format"
import type { Ministry } from "@/lib/types"

type ViewMinistryDialogProps = {
  ministryId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ViewMinistryDialog({ ministryId, open, onOpenChange }: ViewMinistryDialogProps) {
  const { can } = useAuth()
  const canManage = can("ministries.manage")
  const { data: ministry, mutate } = useApi<Ministry>(open ? `/ministries/${ministryId}` : null)
  const [pickerKey, setPickerKey] = useState(0)

  const refresh = () => {
    mutate()
    refreshMinistries()
  }

  const addMember = useApiForm(async (fd) => {
    const memberId = str(fd, "memberId")
    if (!memberId) throw new Error("Pick a member from the list first")
    await post(`/ministries/${ministryId}/members`, { memberId: Number(memberId) })
    setPickerKey((k) => k + 1)
    refresh()
  }, "Member added to ministry")

  const addActivity = useApiForm(async (fd) => {
    await post(`/ministries/${ministryId}/activities`, { title: str(fd, "title"), scheduledAt: str(fd, "scheduledAt") })
    ;(document.getElementById("activity-form") as HTMLFormElement | null)?.reset()
    refresh()
  }, "Activity added")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl [&>[data-slot=dialog-close]]:z-10 [&>[data-slot=dialog-close]]:text-primary-foreground">
        {!ministry ? (
          <>
            <DialogTitle className="sr-only">Loading ministry</DialogTitle>
            <div className="h-40 animate-pulse rounded bg-muted" />
          </>
        ) : (
          <>
            <div className="relative -mx-6 -mt-6 overflow-hidden rounded-t-2xl bg-primary px-6 pb-6 pt-8 text-primary-foreground">
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-fuchsia-300/20 blur-3xl" />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">Ministry</p>
                <DialogTitle className="mt-1 text-3xl text-primary-foreground">{ministry.name}</DialogTitle>
                <DialogDescription className="mt-2 max-w-xl text-primary-foreground/80">
                  {ministry.description || "No description yet."}
                </DialogDescription>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="border-transparent bg-primary-foreground/15 capitalize text-primary-foreground">
                    <span className={`size-1.5 rounded-full ${ministry.status === "active" ? "bg-gold" : "bg-primary-foreground/50"}`} />
                    {ministry.status}
                  </Badge>
                  <Badge className="border-transparent bg-primary-foreground/15 text-primary-foreground">
                    <Users /> {ministry.members} {ministry.members === 1 ? "member" : "members"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-6 py-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border p-4">
                  {ministry.leader ? (
                    <PersonAvatar name={ministry.leader} className="size-12 text-base" />
                  ) : (
                    <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">?</span>
                  )}
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Led by</p>
                    <p className="font-semibold">{ministry.leader ?? "No leader yet"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border p-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-foreground dark:text-gold">
                    <Calendar className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Gathers</p>
                    <p className="font-semibold">
                      {ministry.meetingDay ? `Every ${ministry.meetingDay}` : "No set day"}
                      {ministry.meetingTime ? ` · ${ministry.meetingTime}` : ""}
                    </p>
                    <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" />
                      {ministry.location ?? "Location not set"}
                    </p>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="members" className="gap-4">
                <TabsList>
                  <TabsTrigger value="members">Members ({ministry.memberList?.length ?? 0})</TabsTrigger>
                  <TabsTrigger value="activities">Activities ({ministry.activities?.length ?? 0})</TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="space-y-3">
                  {canManage && (
                    <form onSubmit={addMember.handleSubmit} className="flex gap-2">
                      <div className="flex-1">
                        <MemberPicker key={pickerKey} name="memberId" placeholder="Search a member to add…" />
                      </div>
                      <Button type="submit" disabled={addMember.pending} className="gap-1">
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    </form>
                  )}
                  {ministry.memberList?.length === 0 && <p className="text-sm text-muted-foreground">No members yet.</p>}
                  {ministry.memberList?.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-xl border px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <PersonAvatar name={member.name} />
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold">
                            {member.name}
                            {member.id === ministry.leaderId && <Badge variant="gold">Leader</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.joinedAt ? `Joined ${longDate(member.joinedAt)}` : "Member"}
                          </p>
                        </div>
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${member.name}`}
                          onClick={async () => {
                            if (await runAction(() => del(`/ministries/${ministry.id}/members/${member.id}`), "Member removed"))
                              refresh()
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="activities" className="space-y-3">
                  {canManage && (
                    <form id="activity-form" onSubmit={addActivity.handleSubmit} className="flex flex-col gap-2 sm:flex-row">
                      <Input name="title" placeholder="Activity title" required className="flex-1" />
                      <Input name="scheduledAt" type="datetime-local" className="sm:w-56" />
                      <Button type="submit" disabled={addActivity.pending} className="gap-1">
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    </form>
                  )}
                  {ministry.activities?.length === 0 && <p className="text-sm text-muted-foreground">No activities yet.</p>}
                  {sortActivities(ministry.activities ?? []).map((activity) => {
                    const when = activity.scheduledAt ? new Date(activity.scheduledAt) : null
                    const upcoming = !!when && when.getTime() >= Date.now()
                    return (
                    <div key={activity.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex w-12 shrink-0 flex-col items-center rounded-lg py-1 text-center ${
                            upcoming ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <span className="text-[10px] font-semibold uppercase">
                            {when ? when.toLocaleDateString(undefined, { month: "short" }) : "TBD"}
                          </span>
                          <span className="font-display text-lg leading-none font-semibold">{when ? when.getDate() : "–"}</span>
                        </div>
                        <div>
                          <h4 className="flex items-center gap-2 font-sans text-sm font-semibold">
                            {activity.title}
                            {upcoming && <Badge variant="success">Upcoming</Badge>}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {when
                              ? when.toLocaleString(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" })
                              : "Date not set"}
                          </p>
                        </div>
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete activity"
                          onClick={async () => {
                            if (await runAction(() => del(`/ministries/${ministry.id}/activities/${activity.id}`), "Activity deleted"))
                              refresh()
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    )
                  })}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Upcoming first (soonest first), then past (most recent first), then undated. */
function sortActivities<T extends { scheduledAt: string | null }>(list: T[]) {
  const now = Date.now()
  const t = (a: T) => (a.scheduledAt ? new Date(a.scheduledAt).getTime() : NaN)
  return [...list].sort((a, b) => {
    const ta = t(a), tb = t(b)
    if (isNaN(ta) || isNaN(tb)) return isNaN(ta) ? (isNaN(tb) ? 0 : 1) : -1
    const ua = ta >= now, ub = tb >= now
    if (ua !== ub) return ua ? -1 : 1
    return ua ? ta - tb : tb - ta
  })
}
