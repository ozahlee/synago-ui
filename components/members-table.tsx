"use client"

import { useEffect, useState } from "react"
import { mutate } from "swr"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Pencil, Trash2, Eye, Users, Phone, MapPin, Cake } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MemberFormDialog } from "@/components/member-form-dialog"
import { ViewMemberDialog } from "@/components/view-member-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ContactIcons } from "@/components/contact-buttons"
import { EmptyState, PersonAvatar, StatusBadge, TableCard, TableSkeleton } from "@/components/page"
import { Pager } from "@/components/pager"
import { runAction } from "@/components/form"
import { del, qs, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { daysToBirthday, longDate, tenure } from "@/lib/format"
import type { Member } from "@/lib/types"

type MembersTableProps = {
  searchQuery: string
  filterGender: string
  filterStatus: string
  engagement?: string
  toolbar?: React.ReactNode
}

/** Revalidate every cached members list (any page / filter) plus the dashboard. */
export const refreshMembers = () =>
  mutate((key) => typeof key === "string" && (key.startsWith("/members") || key === "/dashboard" || key.startsWith("/ministries")))

export function MembersTable({ searchQuery, filterGender, filterStatus, engagement, toolbar }: MembersTableProps) {
  const { can } = useAuth()
  const canManage = can("members.manage")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Member | null>(null)
  const [dialog, setDialog] = useState<"view" | "edit" | "delete" | null>(null)

  useEffect(() => setPage(1), [searchQuery, filterGender, filterStatus, engagement])

  const { rows: members, meta, isLoading, error } = usePaginated<Member>(
    qs("/members", { search: searchQuery, gender: filterGender, status: filterStatus, engagement, page, perPage: 20 }),
  )

  const open = (member: Member, which: typeof dialog) => {
    setSelected(member)
    setDialog(which)
  }

  const filtered = !!searchQuery || filterGender !== "all" || filterStatus !== "all"

  return (
    <>
      <TableCard title="Directory" count={meta?.total} actions={toolbar} footer={meta && meta.total > 0 && <Pager meta={meta} onPage={setPage} />}>
        {error && <p className="px-6 pt-4 text-sm text-destructive">{error.message}</p>}
        {isLoading && !meta ? (
          <TableSkeleton />
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title={filtered ? "No one matches" : "No members yet"}
            description={filtered ? "Try a different name or clear the filters." : "Add the first member of the congregation."}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="hidden sm:table-cell">Contact</TableHead>
                <TableHead className="hidden lg:table-cell">Lives in</TableHead>
                <TableHead className="hidden md:table-cell">In fellowship</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const bday = daysToBirthday(member.dateOfBirth)
                const place = member.village ?? member.parish ?? member.subCounty
                return (
                  <TableRow key={member.id} className="cursor-pointer" onClick={() => open(member, "view")}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <PersonAvatar name={member.name} photoUrl={member.photoUrl} className="size-10" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-semibold">
                            {member.name}
                            {bday !== null && bday <= 7 && (
                              <span title={bday === 0 ? "Birthday today" : `Birthday in ${bday} day${bday === 1 ? "" : "s"}`}>
                                <Cake className="size-3.5 text-gold" />
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.pledgeNumber && <span className="font-mono">{member.pledgeNumber}</span>}
                            {member.pledgeNumber && " · "}
                            {member.ministry ?? "No ministry yet"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {member.phone ? (
                        <a
                          href={`tel:${member.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-sm tabular hover:text-primary"
                        >
                          <Phone className="size-3.5 text-muted-foreground" />
                          {member.phone}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                      {member.email && <a href={`mailto:${member.email}`} onClick={(e) => e.stopPropagation()} className="block max-w-52 truncate text-xs text-muted-foreground hover:text-primary">{member.email}</a>}
                      <ContactIcons phone={member.phone} email={member.email} size="xs" className="mt-1" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {place ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <MapPin className="size-3.5 text-muted-foreground" />
                          {place}
                          {member.parish && member.parish !== place && (
                            <span className="text-muted-foreground">· {member.parish}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm">{tenure(member.dateJoined)}</p>
                      <p className="text-xs text-muted-foreground">since {longDate(member.dateJoined)}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={member.status} />
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${member.name}`}
                            className="opacity-60 group-hover/row:opacity-100 data-[state=open]:opacity-100"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => open(member, "view")}>
                            <Eye className="size-4" />
                            View profile
                          </DropdownMenuItem>
                          {canManage && (
                            <>
                              <DropdownMenuItem onClick={() => open(member, "edit")}>
                                <Pencil className="size-4" />
                                Edit details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => open(member, "delete")}>
                                <Trash2 className="size-4" />
                                Remove
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </TableCard>

      {selected && (
        <>
          <ViewMemberDialog
            member={selected}
            open={dialog === "view"}
            onOpenChange={(o) => !o && setDialog(null)}
            onEdit={canManage ? () => setDialog("edit") : undefined}
          />
          <MemberFormDialog
            key={`edit-${selected.id}`}
            member={selected}
            open={dialog === "edit"}
            onOpenChange={(o) => !o && setDialog(null)}
          />
          <ConfirmDialog
            open={dialog === "delete"}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Remove member"
            description={
              <>
                Remove <span className="font-semibold">{selected.name}</span> from the member list? Their giving
                history is kept.
              </>
            }
            confirmLabel="Remove member"
            onConfirm={async () => {
              const ok = await runAction(() => del(`/members/${selected.id}`), "Member removed")
              if (ok) refreshMembers()
              return ok
            }}
          />
        </>
      )}
    </>
  )
}
