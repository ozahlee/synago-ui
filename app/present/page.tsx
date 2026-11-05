"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, X } from "lucide-react"
import { GlanceStrip, IncomeDonut, AttendanceByService, MoneyFlowChart, ProjectBreakdown, ProjectRings } from "@/components/dashboard-glance"
import { Verdict } from "@/components/dashboard-health"
import { PassportPhoto } from "@/components/council-content"
import { qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { KIND_META, LITURGICAL } from "@/lib/calendar"
import { useSettings } from "@/lib/settings"
import type { CalendarRange, Council, DashboardGlance, DashboardHealth, SundaySnapshot } from "@/lib/types"
import { cn } from "@/lib/utils"

const SECONDS = 14
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/**
 * Presentation mode: the dashboard as a full-screen slideshow for a projector or a TV in a meeting.
 * No to-do list and no names beyond the leadership, so it is safe on a public screen. Each slide only
 * appears when the signed-in user may see what is on it.
 */
export default function PresentPage() {
  const router = useRouter()
  const { user, loading, can } = useAuth()
  const settings = useSettings()
  const people = can("members.view"), finance = can("finance.view")
  const ok = !!user && (people || finance)
  useEffect(() => { if (!loading && !user) router.replace("/login?next=/present") }, [loading, user, router])

  const today = new Date()
  const week = new Date(); week.setDate(week.getDate() + 7)
  const { data: health } = useApi<DashboardHealth>(ok ? "/dashboard/health" : null, { refreshInterval: 5 * 60_000 })
  const { data: glance } = useApi<DashboardGlance>(ok ? "/dashboard/glance" : null, { refreshInterval: 5 * 60_000 })
  const { data: sunday } = useApi<SundaySnapshot>(ok ? "/dashboard/sunday" : null)
  const { data: council } = useApi<Council>(ok && people ? "/council" : null)
  const { data: cal } = useApi<CalendarRange>(ok ? qs("/calendar", { from: iso(today), to: iso(week), kinds: "event,announcement,sacrament" }) : null)
  const season = cal?.season ?? cal?.seasons[0] ?? null
  const colour = season ? LITURGICAL[season.colour].bg : "var(--primary)"

  const pcc = council?.bodies.find((b) => b.kind === "council")
  // who is actually serving: a suspended holder gives way to whoever is acting
  const leaders = (pcc?.offices ?? []).flatMap((o) => o.holders.filter((h) => !h.suspension).slice(0, o.seats > 1 ? 4 : 1).map((h) => ({ o, h }))).slice(0, 12)
  // on a shared screen, only the parts of the verdict about the church, not the office's to-do list
  const publicVerdict = health?.verdict ? { ...health.verdict, parts: health.verdict.parts.filter((p) => p.href) } : undefined

  const slides = useMemo(() => {
    const s: Array<{ key: string; title: string; body: React.ReactNode }> = []
    s.push({
      key: "welcome", title: "At a glance",
      body: (
        <div className="flex h-full flex-col justify-center gap-10">
          <p className="max-w-5xl text-3xl leading-snug text-white/80 lg:text-4xl [&_.text-foreground]:text-white [&_a]:decoration-white/60"><Verdict verdict={publicVerdict} /></p>
          <div className="rounded-3xl bg-white/95 p-5 text-foreground shadow-2xl"><GlanceStrip tiles={glance?.tiles} /></div>
        </div>
      ),
    })
    if (finance && glance?.moneyFlow) s.push({
      key: "giving", title: "Collections & spending",
      body: (
        <div className="grid h-full gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="min-w-0 rounded-3xl bg-white p-2 text-foreground shadow-2xl"><MoneyFlowChart data={glance.moneyFlow} height={420} /></div>
          {glance?.incomeMix && <div className="min-w-0 rounded-3xl bg-white p-2 text-foreground shadow-2xl"><IncomeDonut data={glance.incomeMix} large /></div>}
        </div>
      ),
    })
    if (people && glance?.attendanceByService) s.push({
      key: "worship", title: "Worship",
      body: (
        <div className="grid h-full gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="min-w-0 rounded-3xl bg-white p-2 text-foreground shadow-2xl"><AttendanceByService data={glance.attendanceByService} height={440} /></div>
          {sunday && (
            <div className="flex flex-col justify-center gap-5 rounded-3xl bg-white/10 p-8 ring-1 ring-white/20">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Last Sunday · {new Date(`${sunday.date}T00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long" })}</p>
              {sunday.showAttendance && <Big n={sunday.totals.attendance ?? 0} label="in church" />}
              {sunday.showAttendance && <Big n={sunday.totals.visitors ?? 0} label="visitors welcomed" />}
              {glance.attendanceByService.weeks.length > 0 && <Big n={Number(glance.attendanceByService.weeks.at(-1)?.["Sunday school"] ?? 0)} label="children in Sunday school" />}
            </div>
          )}
        </div>
      ),
    })
    if (finance && glance?.expenseMix?.slices.length) s.push({
      key: "spending", title: "Where the money goes",
      body: (
        <div className="grid h-full gap-6 lg:grid-cols-2">
          <div className="min-w-0 rounded-3xl bg-white p-2 text-foreground shadow-2xl"><IncomeDonut data={glance.expenseMix} large title="What's consuming the money" /></div>
          {glance.projectBreakdown && <div className="min-w-0 rounded-3xl bg-white p-2 text-foreground shadow-2xl"><ProjectBreakdown projects={glance.projectBreakdown} /></div>}
        </div>
      ),
    })
    if (finance && glance?.projects?.length) s.push({
      key: "projects", title: "Projects",
      body: <div className="flex h-full items-center"><div className="w-full rounded-3xl bg-white p-6 text-foreground shadow-2xl"><ProjectRings projects={glance.projects} large /></div></div>,
    })
    if (leaders.length) s.push({
      key: "leaders", title: "Our leadership",
      body: (
        <div className="grid h-full content-center gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {leaders.map(({ o, h }) => (
            <div key={`${o.id}-${h.positionId}`} className="flex flex-col items-center rounded-3xl bg-white/95 p-4 text-center text-foreground shadow-xl">
              <PassportPhoto url={h.photoUrl} name={h.name} className="w-24 text-lg" />
              <p className="mt-3 font-semibold leading-tight">{h.name}</p>
              <p className="mt-0.5 text-xs uppercase tracking-[0.1em] text-muted-foreground">{h.acting ? `Acting ${o.title.toLowerCase()}` : o.title}</p>
            </div>
          ))}
        </div>
      ),
    })
    if (cal?.items.length) s.push({
      key: "week", title: "This week",
      body: (
        <ul className="mx-auto grid h-full max-w-4xl content-center gap-3">
          {cal.items.slice(0, 7).map((i) => (
            <li key={i.id} className="flex items-center gap-5 rounded-2xl bg-white/95 px-6 py-4 text-foreground shadow-lg">
              <span className={`h-12 w-1.5 shrink-0 rounded-full ${KIND_META[i.kind].dot}`} />
              <span className="w-28 shrink-0 text-lg font-semibold text-muted-foreground">{new Date(i.allDay ? `${i.start}T00:00` : i.start).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</span>
              <span className="min-w-0 flex-1 truncate text-2xl font-medium">{i.title}</span>
            </li>
          ))}
        </ul>
      ),
    })
    return s
  }, [health, glance, sunday, cal, leaders, finance, people, publicVerdict])

  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [tick, setTick] = useState(0)
  const [full, setFull] = useState(false)
  const [idle, setIdle] = useState(false)
  const n = slides.length
  const go = useCallback((d: number) => { setI((x) => (x + d + n) % Math.max(1, n)); setTick(0) }, [n])

  useEffect(() => {
    if (paused || n < 2) return
    const t = setInterval(() => setTick((x) => { if (x + 1 >= SECONDS * 10) { setI((y) => (y + 1) % n); return 0 } return x + 1 }), 100)
    return () => clearInterval(t)
  }, [paused, n])
  const toggleFull = useCallback(() => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") go(1)
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1)
      else if (e.key === " ") { e.preventDefault(); setPaused((p) => !p) }
      else if (e.key.toLowerCase() === "f") toggleFull()
      else if (e.key === "Escape" && !document.fullscreenElement) router.push("/")
    }
    const onFs = () => setFull(!!document.fullscreenElement)
    window.addEventListener("keydown", onKey)
    document.addEventListener("fullscreenchange", onFs)
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("fullscreenchange", onFs) }
  }, [go, toggleFull, router])
  // hide the controls and the cursor when nobody is touching the mouse
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const wake = () => { setIdle(false); clearTimeout(t); t = setTimeout(() => setIdle(true), 3000) }
    wake()
    window.addEventListener("mousemove", wake)
    return () => { window.removeEventListener("mousemove", wake); clearTimeout(t) }
  }, [])

  if (!ok) return <div className="flex h-screen items-center justify-center bg-primary text-white/70">{loading ? "Opening…" : "Presentation mode needs access to the dashboard."}</div>
  const slide = slides[Math.min(i, n - 1)]

  return (
    <div className={cn("relative flex h-screen flex-col overflow-hidden text-white", idle && "cursor-none")}
      style={{ background: `radial-gradient(1200px 600px at 85% -10%, color-mix(in oklch, ${colour} 55%, transparent), transparent 60%), linear-gradient(160deg, var(--primary) 0%, color-mix(in oklch, var(--primary) 70%, black) 100%)` }}>
      <header className="flex items-center justify-between px-10 pb-2 pt-7">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">{settings.churchName}</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight lg:text-5xl">{slide?.title}</h1>
        </div>
        <div className="text-right">
          <p className="text-lg font-medium tabular"><Clock /></p>
          <p className="flex items-center justify-end gap-2 text-sm text-white/70">
            {today.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
            {season && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5"><span className="size-2 rounded-full ring-1 ring-white/40" style={{ background: colour }} />{season.kind === "feast" ? season.name : `Season of ${season.name}`}</span>}
          </p>
        </div>
      </header>

      <main key={slide?.key} className="min-h-0 flex-1 animate-in fade-in slide-in-from-bottom-2 px-10 py-6 duration-500">{slide?.body}</main>

      <footer className={cn("flex items-center justify-between gap-4 px-10 pb-6 transition-opacity duration-500", idle && "opacity-0")}>
        <div className="flex items-center gap-2">
          {slides.map((s, k) => (
            <button key={s.key} type="button" onClick={() => { setI(k); setTick(0) }} aria-label={s.title}
              className={cn("relative h-1.5 overflow-hidden rounded-full bg-white/25 transition-all", k === i ? "w-16" : "w-6 hover:bg-white/40")}>
              {k === i && <span className="absolute inset-y-0 left-0 bg-white" style={{ width: `${paused ? 100 : (tick / (SECONDS * 10)) * 100}%` }} />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Ctl onClick={() => go(-1)} label="Previous (←)"><ChevronLeft className="size-5" /></Ctl>
          <Ctl onClick={() => setPaused((p) => !p)} label={paused ? "Play (space)" : "Pause (space)"}>{paused ? <Play className="size-5" /> : <Pause className="size-5" />}</Ctl>
          <Ctl onClick={() => go(1)} label="Next (→)"><ChevronRight className="size-5" /></Ctl>
          <Ctl onClick={toggleFull} label="Full screen (F)">{full ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}</Ctl>
          <Link href="/" className="ml-2 inline-flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Leave presentation (Esc)" title="Leave presentation (Esc)"><X className="size-5" /></Link>
        </div>
      </footer>
    </div>
  )
}

function Ctl({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">{children}</button>
}

function Big({ n, label }: { n: number; label: string }) {
  return <div><p className="text-6xl font-semibold tabular">{n.toLocaleString()}</p><p className="text-lg text-white/70">{label}</p></div>
}

function Clock() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => { const x = setInterval(() => setT(new Date()), 15_000); return () => clearInterval(x) }, [])
  return <>{t.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</>
}
