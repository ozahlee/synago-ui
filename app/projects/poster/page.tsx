"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { longDate, money, today } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import type { Loan, Project, ProjectSummary } from "@/lib/types"
import useSWR from "swr"

/** A printable progress poster for the notice board: thermometer, milestones, top cells and the honour roll. */
function Poster() {
  const id = useSearchParams().get("id")
  const router = useRouter()
  const { user, loading } = useAuth()
  const settings = useSettings()
  const { data: p } = useApi<Project>(user && id ? `/projects/${id}` : null)
  const { data: s } = useApi<ProjectSummary>(user && id ? `/projects/${id}/summary` : null)
  const { data: loans } = useSWR<{ data: Loan[] }>(user && id ? `/loans?projectId=${id}` : null, (k: string) => api<{ data: Loan[] }>(k))
  const loan = loans?.data.find((l) => l.status === "active")

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(`/projects/poster?id=${id}`)}`)
  }, [loading, user, router, id])

  if (!p || !s) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Preparing poster…</div>

  const pct = p.goal ? Math.min(100, (p.raised / p.goal) * 100) : 0
  const pledgedPct = p.goal ? Math.min(100 - pct, (p.pledgeBalance / p.goal) * 100) : 0
  const cells = [...s.cells].filter((c) => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 8)
  const roll = s.honourRoll.slice(0, 24)
  const ticks = [0, 25, 50, 75, 100]

  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">Print on A4 (portrait) for the notice board.</p>
        <Button onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
      </div>
      <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-card shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="h-2 bg-gradient-to-r from-primary via-primary to-gold" />
        <div className="p-10 print:p-6">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{settings.churchName}</p>
            <h1 className="mt-2 text-4xl font-semibold">{p.name}</h1>
            {p.description && <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">{p.description}</p>}
          </header>

          <div className="mt-8 grid gap-8 sm:grid-cols-[160px_1fr]">
            {/* thermometer */}
            <div className="mx-auto flex flex-col items-center">
              <div className="relative flex h-80 w-14 flex-col-reverse overflow-hidden rounded-t-full border-4 border-primary/30 bg-muted">
                <div className="w-full bg-primary" style={{ height: `${pct}%` }} />
                <div className="w-full bg-primary/25" style={{ height: `${pledgedPct}%` }} />
                {ticks.map((t) => <span key={t} className="absolute right-0 h-px w-3 bg-foreground/30" style={{ bottom: `${t}%` }} />)}
              </div>
              <div className="-mt-2 size-20 rounded-full border-4 border-primary/30 bg-primary" />
              <p className="mt-2 text-3xl font-semibold tabular text-primary">{Math.round(pct)}%</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Figure label="Raised" value={money(p.raised)} strong />
                <Figure label="Goal" value={money(p.goal)} />
                <Figure label="Still pledged" value={money(p.pledgeBalance)} />
                <Figure label="Still needed" value={money(Math.max(0, p.goal - p.raised))} />
              </div>
              {p.inKindValue > 0 && <p className="text-sm text-muted-foreground">Plus gifts in kind worth about <b className="text-foreground">{money(p.inKindValue)}</b> — thank you!</p>}
              {p.deadline && <p className="text-sm">Target date: <b>{longDate(p.deadline)}</b>{p.suggestedFamilyAmount ? <> · Each family is asked for <b>{money(p.suggestedFamilyAmount)}</b></> : null}</p>}

              {(p.milestones?.length ?? 0) > 0 && (
                <div>
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Milestones</h2>
                  <ul className="space-y-1 text-sm">
                    {p.milestones!.map((m) => (
                      <li key={m.id} className="flex items-center gap-2">
                        <span>{m.status === "done" ? "✅" : "⬜"}</span>
                        <span className={m.status === "done" ? "text-muted-foreground line-through" : ""}>{m.title}</span>
                        {m.amount ? <span className="ml-auto tabular text-muted-foreground">{money(m.amount)}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {cells.length > 0 && (
                <div>
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cell league</h2>
                  <ol className="space-y-1.5 text-sm">
                    {cells.map((c, i) => (
                      <li key={c.id} className="flex items-center gap-2">
                        <span className="w-5 text-muted-foreground tabular">{i + 1}.</span>
                        <span className="flex-1 truncate">{c.name}</span>
                        <span className="font-semibold tabular">{money(c.total)}</span>
                        {c.target ? <span className="w-12 text-right text-xs text-muted-foreground tabular">{Math.round(Math.min(100, (c.total / c.target) * 100))}%</span> : null}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>

          {loan && (
            <section className="mt-8 rounded-2xl border-2 border-primary/20 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Clearing the loan · {loan.lender}</h2>
                <p className="text-sm"><b className="tabular">{money(loan.summary.principalPaid)}</b> repaid of {money(Math.max(loan.summary.disbursed, loan.principal))}</p>
              </div>
              <div className="mt-3 h-6 overflow-hidden rounded-full bg-success/20"><div className="ml-auto h-full rounded-full bg-primary" style={{ width: `${Math.max(0, 100 - loan.summary.progress)}%` }} /></div>
              <p className="mt-2 text-sm text-muted-foreground">Still owed <b className="text-foreground">{money(loan.summary.outstanding + loan.summary.undrawn)}</b>{loan.summary.endDate ? ` · to be cleared by ${longDate(loan.summary.endDate)}` : ""}. Every gift to this project brings that day closer.</p>
            </section>
          )}

          {roll.length > 0 && (
            <section className="mt-8 border-t pt-6">
              <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">With gratitude to</h2>
              <ul className="mt-3 columns-2 gap-8 text-sm sm:columns-3">
                {roll.map((r, i) => <li key={`${r.name}-${i}`} className="break-inside-avoid py-0.5">{r.name}</li>)}
              </ul>
              {s.honourRoll.length > roll.length && <p className="mt-2 text-center text-xs text-muted-foreground">…and {s.honourRoll.length - roll.length} more givers</p>}
            </section>
          )}

          <footer className="mt-8 text-center text-xs text-muted-foreground">
            “Each of you should give what you have decided in your heart to give… for God loves a cheerful giver.” — 2 Corinthians 9:7
            <br />Updated {longDate(today())}
          </footer>
        </div>
      </article>
    </div>
  )
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={strong ? "text-2xl font-semibold tabular text-primary" : "text-xl font-semibold tabular"}>{value}</p>
    </div>
  )
}

export default function Page() {
  return <Suspense><Poster /></Suspense>
}
