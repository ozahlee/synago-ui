"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { qs, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { ANNOUNCEMENT_META, parseLocal } from "@/lib/announcements"
import { useSettings } from "@/lib/settings"
import type { Announcement } from "@/lib/types"

/** One printable page of upcoming announcements to read out on Sunday. */
export default function AnnouncementSheet() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const settings = useSettings()
  const { rows, isLoading } = usePaginated<Announcement>(user ? qs("/announcements", { when: "upcoming", perPage: 30 }) : null)

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/announcements/print")
  }, [loading, user, router])

  const sunday = new Date()
  sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7))

  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">Upcoming announcements, ready to print or read from the pulpit.</p>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" /> Print
        </Button>
      </div>
      <article className="mx-auto max-w-3xl rounded-2xl bg-card p-10 shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="border-b-2 border-primary pb-5 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{settings.churchName}</p>
          <h1 className="mt-1 text-3xl font-semibold">Church announcements</h1>
          <p className="mt-1 text-muted-foreground">
            Sunday, {sunday.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </header>

        {isLoading ? (
          <div className="mt-8 h-60 animate-pulse rounded-xl bg-muted" />
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">No upcoming announcements.</p>
        ) : (
          <ol className="mt-6 divide-y">
            {rows.map((a, i) => {
              const m = ANNOUNCEMENT_META[a.type]
              const at = a.eventAt ? parseLocal(a.eventAt) : null
              return (
                <li key={a.id} className="flex gap-4 py-5 break-inside-avoid">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
                    <h2 className="text-lg font-semibold">
                      {a.title}
                      {a.subject ? <span className="font-normal"> · {a.subject}</span> : null}
                    </h2>
                    {(at || a.venue) && (
                      <p className="mt-0.5 text-sm font-medium">
                        {at && at.toLocaleString(undefined, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}
                        {at && a.venue ? " · " : ""}
                        {a.venue}
                      </p>
                    )}
                    {a.details && <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{a.details}</p>}
                    {(a.contactName || a.contactPhone) && (
                      <p className="mt-1.5 text-sm">
                        Contact: {a.contactName} {a.contactPhone}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </article>
    </div>
  )
}
