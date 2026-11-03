"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BookOpen, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { qs, useApi, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { LITURGICAL } from "@/lib/calendar"
import { longDate } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import type { CalendarRange, Sermon } from "@/lib/types"

function Programme() {
  const params = useSearchParams()
  const router = useRouter()
  const date = params.get("date") ?? new Date().toISOString().slice(0, 10)
  const { user, loading } = useAuth()
  const settings = useSettings()
  const { rows: sermons, isLoading } = usePaginated<Sermon>(user ? qs("/sermons", { date, perPage: 20 }) : null)
  const { data: cal } = useApi<CalendarRange>(user ? qs("/calendar", { from: date, to: date, kinds: "event" }) : null)

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(`/sermons/print?date=${date}`)}`)
  }, [loading, user, router, date])

  const season = cal?.seasons[0]
  const feast = cal?.feasts[0]
  const order = (s: string | null) => (s ? settings.services.indexOf(s) : 99)
  const timeOf = (s: string | null) => (s ? settings.serviceTimes?.[settings.services.indexOf(s)] : null)
  const list = [...sermons].sort((a, b) => order(a.service) - order(b.service))
  const events = (cal?.items ?? []).filter((i) => i.kind === "event")

  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-3xl flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sunday</span>
          <Input type="date" value={date} onChange={(e) => e.target.value && router.replace(`/sermons/print?date=${e.target.value}`)} className="h-9 w-40" />
        </div>
        <Button onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
      </div>
      <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-card shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        {season && <div className="h-2" style={{ background: LITURGICAL[season.colour].bg }} />}
        <div className="p-10 print:p-6">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{settings.churchName}</p>
            <h1 className="mt-2 text-3xl font-semibold">Order of the day</h1>
            <p className="mt-1 text-muted-foreground">{longDate(date)}</p>
            {(season || feast) && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                {season && <span className="size-2.5 rounded-full" style={{ background: LITURGICAL[(feast ?? season).colour].bg }} />}
                {[feast?.name, season ? `Season of ${season.name}` : null].filter(Boolean).join(" · ")}
              </p>
            )}
          </header>

          {isLoading ? <div className="mt-8 h-60 animate-pulse rounded-xl bg-muted" /> : list.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">No preaching planned for this day yet.</p>
          ) : (
            <ol className="mt-8 space-y-6">
              {list.map((s) => (
                <li key={s.id} className="break-inside-avoid rounded-2xl border p-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="text-xl font-semibold">{s.service ?? "Service"}</h2>
                    {timeOf(s.service) && <span className="text-sm font-semibold text-muted-foreground tabular">{timeOf(s.service)}</span>}
                  </div>
                  <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1.5 text-sm">
                    <dt className="text-muted-foreground">Preacher</dt>
                    <dd className="font-medium">{s.preacher}{s.visiting && s.preacherChurch ? `, ${s.preacherChurch}` : ""}</dd>
                    {(s.theme || s.title) && (<><dt className="text-muted-foreground">Theme</dt><dd className="font-medium">{[s.theme, s.title && s.title !== s.theme ? `“${s.title}”` : null].filter(Boolean).join(" · ")}</dd></>)}
                    {s.series && (<><dt className="text-muted-foreground">Series</dt><dd>{s.series}</dd></>)}
                    {s.scriptures.length > 0 && (
                      <><dt className="text-muted-foreground">Readings</dt>
                        <dd className="flex flex-wrap gap-x-3 gap-y-1">{s.scriptures.map((r, i) => <span key={r} className={i === 0 ? "font-semibold" : ""}>{i === 0 && <BookOpen className="mr-1 inline size-3.5" />}{r}</span>)}</dd></>
                    )}
                  </dl>
                </li>
              ))}
            </ol>
          )}

          {events.length > 0 && (
            <section className="mt-8 border-t pt-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Also today</h2>
              <ul className="space-y-1 text-sm">
                {events.map((e) => <li key={e.id}><span className="font-medium">{e.title}</span>{e.subtitle ? ` · ${e.subtitle}` : ""}</li>)}
              </ul>
            </section>
          )}
        </div>
      </article>
    </div>
  )
}

export default function SermonProgrammePage() {
  return (
    <Suspense>
      <Programme />
    </Suspense>
  )
}
