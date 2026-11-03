"use client"

import { useEffect, useState } from "react"
import { mutate } from "swr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Calendar, MoreHorizontal, Pencil, Trash2, Eye, UsersRound } from "lucide-react"
import { EmptyState, PersonAvatar, StatusBadge } from "@/components/page"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ViewMinistryDialog } from "@/components/view-ministry-dialog"
import { MinistryFormDialog } from "@/components/ministry-form-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { runAction } from "@/components/form"
import { del, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlParam } from "@/lib/use-url-param"
import type { Ministry } from "@/lib/types"

export const refreshMinistries = () =>
  mutate((key) => typeof key === "string" && (key.startsWith("/ministries") || key.startsWith("/members")))

export function MinistriesGrid() {
  const { can } = useAuth()
  const canManage = can("ministries.manage")
  const [selected, setSelected] = useState<Ministry | null>(null)
  const [dialog, setDialog] = useState<"view" | "edit" | "delete" | null>(null)

  const { data: ministries = [], isLoading, error } = useApi<Ministry[]>("/ministries")

  const [openId, setOpenId] = useState<string | null>(null)
  useUrlParam("open", setOpenId)
  useEffect(() => {
    const m = openId && ministries.find((x) => x.id === openId)
    if (m) {
      setSelected(m)
      setDialog("view")
      setOpenId(null)
    }
  }, [openId, ministries])

  const open = (ministry: Ministry, which: typeof dialog) => {
    setSelected(ministry)
    setDialog(which)
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded" />
                <div className="h-10 bg-muted rounded-full w-10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) return <p className="text-destructive">{error.message}</p>

  return (
    <>
      {ministries.length === 0 && (
        <Card className="py-0">
          <EmptyState icon={UsersRound} title="No ministries yet" description="Add the choir, youth fellowship, mothers' union and the other groups that serve." />
        </Card>
      )}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {ministries.map((ministry, i) => (
          <Card
            key={ministry.id}
            className="group relative cursor-pointer gap-0 overflow-hidden py-0 transition hover:-translate-y-0.5 hover:border-primary/25"
            onClick={() => open(ministry, "view")}
          >
            <div className="h-1.5" style={{ background: `var(--chart-${(i % 5) + 1})` }} />
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <h3 className="text-lg font-semibold leading-tight">{ministry.name}</h3>
                  <StatusBadge status={ministry.status} />
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Actions">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => open(ministry, "view")}>
                        <Eye className="size-4" />
                        Open
                      </DropdownMenuItem>
                      {canManage && (
                        <>
                          <DropdownMenuItem onClick={() => open(ministry, "edit")}>
                            <Pencil className="size-4" />
                            Edit ministry
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => open(ministry, "delete")}>
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                {ministry.description || "No description yet."}
              </p>

              <div className="mt-4 flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
                {ministry.leader ? (
                  <PersonAvatar name={ministry.leader} />
                ) : (
                  <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">?</span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{ministry.leader ?? "No leader yet"}</p>
                  <p className="text-xs text-muted-foreground">Leader</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4" />
                  <span className="font-medium text-foreground tabular">{ministry.members}</span> {ministry.members === 1 ? "member" : "members"}
                </span>
                {ministry.meetingDay && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-4" />
                    {ministry.meetingDay}
                    {ministry.meetingTime ? ` · ${ministry.meetingTime}` : ""}
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selected && (
        <>
          <ViewMinistryDialog ministryId={selected.id} open={dialog === "view"} onOpenChange={(o) => !o && setDialog(null)} />
          <MinistryFormDialog
            key={`edit-${selected.id}`}
            ministry={selected}
            open={dialog === "edit"}
            onOpenChange={(o) => !o && setDialog(null)}
          />
          <ConfirmDialog
            open={dialog === "delete"}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Delete ministry"
            description={
              <>
                Delete <span className="font-semibold">{selected.name}</span>? Members stay in the church directory
                but are removed from this ministry.
              </>
            }
            onConfirm={async () => {
              const ok = await runAction(() => del(`/ministries/${selected.id}`), "Ministry deleted")
              if (ok) refreshMinistries()
              return ok
            }}
          />
        </>
      )}
    </>
  )
}
