"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrgChart } from "@/components/council-content"
import { qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { LITURGICAL } from "@/lib/calendar"
import { longDate } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import type { CalendarRange, Council, CouncilBody } from "@/lib/types"

/** The organogram for the notice board or the diocese: the council first, then each committee and organisation. */
function CouncilPrint() {
  const asOf = useSearchParams().get("asOf") ?? new Date().toISOString().slice(0, 10)
  const router = useRouter()
  const { user, loading } = useAuth()
  const settings = useSettings()
  const { data } = useApi<Council>(user ? qs("/council", { asOf }) : null)
  const { data: cal } = useApi<CalendarRange>(user ? qs("/calendar", { from: asOf, to: asOf, kinds: "event" }) : null)
  useEffect(() => { if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(`/council/print?asOf=${asOf}`)}`) }, [loading, user, router, asOf])
  const season = cal?.season ?? cal?.seasons[0]
  const colour = season ? LITURGICAL[season.colour].bg : "var(--primary)"

  if (!data) return <div className="m-10 h-[600px] animate-pulse rounded-2xl bg-muted" />
  // depth-first: each body followed by the bodies under it
  const order: CouncilBody[] = []
  const walk = (parent: string | null) => data.bodies.filter((b) => b.parentId === parent).forEach((b) => { order.push(b); walk(b.id) })
  walk(null)
  const [first, ...rest] = order.filter((b) => b.offices.length > 0)

  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-8 print:bg-white print:p-0">
      <style>{"@page { size: A4 landscape; margin: 12mm; }"}</style>
      <div className="mx-auto mb-6 flex max-w-6xl justify-end print:hidden"><Button onClick={() => window.print()}><Printer className="size-4" /> Print</Button></div>
      <article className="mx-auto max-w-6xl rounded-2xl bg-card shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="h-2 rounded-t-2xl print:rounded-none" style={{ background: colour }} />
        <div className="p-8 print:p-0 print:pt-4">
          <header className="mb-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{settings.churchName}</p>
            {settings.diocese && <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{settings.diocese}</p>}
            <h1 className="mt-2 text-2xl font-semibold">Church leadership</h1>
            <p className="text-sm text-muted-foreground">As at {longDate(data.asOf)}</p>
          </header>
          {[first, ...rest].filter(Boolean).map((b, i) => (
            <section key={b.id} className={i > 0 ? "mt-10 break-before-page border-t pt-6 print:border-0 print:pt-0" : ""}>
              <h2 className="mb-1 text-center text-lg font-semibold">{b.name}</h2>
              {b.description && <p className="mb-4 text-center text-xs text-muted-foreground">{b.description}</p>}
              <div className="overflow-x-auto print:overflow-visible"><OrgChart body={b} print /></div>
            </section>
          ))}
        </div>
      </article>
    </div>
  )
}

export default function CouncilPrintPage() {
  return <Suspense><CouncilPrint /></Suspense>
}
