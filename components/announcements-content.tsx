"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Printer, MapPin, Phone, Pin, MoreHorizontal, Pencil, Trash2, Megaphone, Clock, MessageSquareText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Page, PageHeader } from "@/components/page"
import { Pager } from "@/components/pager"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { runAction } from "@/components/form"
import { AnnouncementFormDialog, refreshAnnouncements } from "@/components/announcement-form-dialog"
import { del, qs, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlParam } from "@/lib/use-url-param"
import { ANNOUNCEMENT_META, parseLocal } from "@/lib/announcements"
import { ANNOUNCEMENT_TYPES, type Announcement } from "@/lib/types"
import { cn } from "@/lib/utils"

export function AnnouncementsContent() {
  const { can } = useAuth()
  const canManage = can("alerts.manage")
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming")
  const [type, setType] = useState("all")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Announcement | null>(null)
  const [dialog, setDialog] = useState<"new" | "edit" | "delete" | null>(null)

  useUrlParam("when", (w) => (w === "upcoming" || w === "past") && (setWhen(w), setType("all"), setPage(1)))

  const { rows, meta, isLoading } = usePaginated<Announcement>(qs("/announcements", { when, type, page, perPage: 12 }))

  return (
    <Page className="max-w-5xl">
      <PageHeader
        eyebrow="Office"
        title="Announcements"
        description="Burials, weddings, introductions, thanksgivings and meetings: news for the church family."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/announcements/print" target="_blank">
                <Printer className="size-4" /> Sunday sheet
              </Link>
            </Button>
            {canManage && (
              <Button onClick={() => setDialog("new")}>
                <Plus className="size-4" /> New announcement
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={when}
          onValueChange={(v) => {
            setWhen(v as typeof when)
            setPage(1)
          }}
        >
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44" aria-label="Type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All kinds</SelectItem>
            {ANNOUNCEMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {ANNOUNCEMENT_META[t].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && !meta ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="py-0">
          <EmptyState
            icon={Megaphone}
            title={when === "upcoming" ? "Nothing coming up" : "No past announcements"}
            description="Post burial arrangements, weddings, meetings and other news for the congregation."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((a) => (
            <AnnouncementCard
              key={a.id}
              a={a}
              canManage={canManage}
              onEdit={() => (setSelected(a), setDialog("edit"))}
              onDelete={() => (setSelected(a), setDialog("delete"))}
            />
          ))}
          <Pager meta={meta} onPage={setPage} />
        </div>
      )}

      <AnnouncementFormDialog key="new" open={dialog === "new"} onOpenChange={(o) => !o && setDialog(null)} />
      {selected && (
        <>
          <AnnouncementFormDialog key={`edit-${selected.id}`} record={selected} open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} />
          <ConfirmDialog
            open={dialog === "delete"}
            onOpenChange={(o) => !o && setDialog(null)}
            title="Delete announcement"
            description={
              <>
                Delete <span className="font-semibold">{selected.title}</span>? It will no longer appear on the Sunday sheet.
              </>
            }
            onConfirm={async () => {
              const ok = await runAction(() => del(`/announcements/${selected.id}`), "Announcement deleted")
              if (ok) refreshAnnouncements()
              return ok
            }}
          />
        </>
      )}
    </Page>
  )
}

function smsText(a: Announcement, at: Date | null) {
  const when = at ? at.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : ""
  return [`{church}: ${a.title}${a.subject ? ` - ${a.subject}` : ""}.`, when && `${when}`, a.venue && `at ${a.venue}.`, a.contactPhone && `Contact ${a.contactName ?? ""} ${a.contactPhone}`]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

function AnnouncementCard({ a, canManage, onEdit, onDelete }: { a: Announcement; canManage: boolean; onEdit: () => void; onDelete: () => void }) {
  const { can } = useAuth()
  const m = ANNOUNCEMENT_META[a.type]
  const at = a.eventAt ? parseLocal(a.eventAt) : null

  return (
    <Card className={cn("flex-row gap-0 overflow-hidden py-0", a.type === "burial" && "border-foreground/20")}>
      <div
        className={cn(
          "flex w-24 shrink-0 flex-col items-center justify-center gap-0.5 border-r px-2 py-5 text-center sm:w-28",
          a.type === "burial" ? "bg-foreground text-background" : "bg-secondary/60",
        )}
      >
        {at ? (
          <>
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{at.toLocaleDateString(undefined, { weekday: "short" })}</span>
            <span className="text-3xl font-semibold leading-none tabular">{at.getDate()}</span>
            <span className="text-xs font-medium uppercase opacity-80">{at.toLocaleDateString(undefined, { month: "short" })}</span>
            <span className="mt-1.5 flex items-center gap-1 text-[11px] opacity-70">
              <Clock className="size-3" />
              {at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </span>
          </>
        ) : (
          <m.icon className="size-6 opacity-60" />
        )}
      </div>

      <div className="min-w-0 flex-1 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={m.tone}>
                <m.icon /> {m.label}
              </Badge>
              {a.pinned && (
                <Badge variant="gold">
                  <Pin /> Pinned
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-semibold leading-snug">{a.title}</h3>
            {a.subject && <p className={cn("font-medium", a.type === "burial" ? "text-foreground" : "text-primary")}>{a.subject}</p>}
          </div>
          {(canManage || can("sms.send")) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {can("sms.send") && (
                  <DropdownMenuItem asChild>
                    <Link href={`/sms?message=${encodeURIComponent(smsText(a, at))}`}>
                      <MessageSquareText className="size-4" /> Send as SMS
                    </Link>
                  </DropdownMenuItem>
                )}
                {canManage && (<>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
                </>)}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {a.details && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{a.details}</p>}

        {(a.venue || a.contactName || a.contactPhone || a.memberName) && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t pt-3 text-sm">
            {a.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-muted-foreground" /> {a.venue}
              </span>
            )}
            {(a.contactName || a.contactPhone) && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-4 text-muted-foreground" />
                {a.contactName}
                {a.contactPhone && (
                  <a href={`tel:${a.contactPhone}`} className="font-medium text-primary hover:underline tabular">
                    {a.contactPhone}
                  </a>
                )}
              </span>
            )}
            {a.memberName && <span className="text-muted-foreground">Member: {a.memberName}</span>}
          </div>
        )}
      </div>
    </Card>
  )
}
