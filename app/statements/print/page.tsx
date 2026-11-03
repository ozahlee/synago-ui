"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Church, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { date, longDate, money, titleCase, today } from "@/lib/format"
import { rangeLabel } from "@/lib/period"
import { useSettings } from "@/lib/settings"
import { OFFERTORY_CATEGORIES, type GivingStatement } from "@/lib/types"

function Statements() {
  const params = useSearchParams()
  const year = params.get("year") ?? String(new Date().getFullYear())
  const from = params.get("from") ?? undefined
  const to = params.get("to") ?? undefined
  const range = from || to ? { from, to } : { year }
  const memberId = params.get("memberId")
  const router = useRouter()
  const { user, loading } = useAuth()
  const one = useApi<GivingStatement>(user && memberId ? qs("/reports/statement", { memberId, ...range }) : null)
  const all = useApi<GivingStatement[]>(user && !memberId ? qs("/reports/statements", range) : null)
  const list = memberId ? (one.data ? [one.data] : undefined) : all.data

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(`/statements/print?${params.toString()}`)}`)
  }, [loading, user, router, params])

  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">{list ? `${list.length} statement${list.length === 1 ? "" : "s"} for ${list[0] ? periodOf(list[0]) : year}. Each prints on its own page.` : "Loading…"}</p>
        <Button onClick={() => window.print()} disabled={!list?.length}><Printer className="size-4" /> Print</Button>
      </div>
      {!list ? <div className="mx-auto h-[700px] max-w-3xl animate-pulse rounded-2xl bg-muted" /> : list.map((s) => <Letter key={s.member.id} s={s} />)}
    </div>
  )
}

function Letter({ s }: { s: GivingStatement }) {
  const settings = useSettings()
  return (
    <article className="mx-auto mb-8 max-w-3xl break-after-page rounded-2xl bg-card p-10 shadow-xl print:mb-0 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
      <header className="flex items-start justify-between gap-6 border-b-2 border-primary pb-5">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Church className="size-6" /></span>
          <div>
            <p className="text-xl font-semibold">{settings.churchName}</p>
            <p className="text-sm text-muted-foreground">{[settings.diocese, settings.address].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Giving statement</p>
          <p className="text-2xl font-semibold">{periodOf(s)}</p>
        </div>
      </header>

      <section className="mt-6 flex justify-between gap-6 text-sm">
        <div>
          <p className="text-lg font-semibold">{s.member.name}</p>
          {s.member.address && <p className="text-muted-foreground">{s.member.address}</p>}
          {s.member.phone && <p className="text-muted-foreground">{s.member.phone}</p>}
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Pledge no.</p>
          <p className="font-mono font-semibold">{s.member.pledgeNumber ?? "—"}</p>
          <p className="mt-1 text-muted-foreground">Issued {longDate(today())}</p>
        </div>
      </section>

      <p className="mt-6 text-sm leading-relaxed">
        Dear {s.member.name.split(" ")[0]}, thank you for your faithful giving to the Lord&apos;s work through {settings.churchName} {isWholeYear(s) ? "in" : "for"} {periodOf(s)}.
        Below is a record of what you gave. &ldquo;Each of you should give what you have decided in your heart to give… for God loves a cheerful giver.&rdquo; (2 Corinthians 9:7)
      </p>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {OFFERTORY_CATEGORIES.map((c) => (
          <div key={c} className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">{titleCase(c)}</p><p className="font-semibold tabular">{money(s.byCategory[c])}</p></div>
        ))}
      </section>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
        <span className="text-sm text-primary">
          Total given {isWholeYear(s) ? "in" : "for"} {periodOf(s)}
          {s.donationTotal > 0 && <span className="text-muted-foreground"> (incl. {money(s.donationTotal)} to church projects)</span>}
        </span>
        <span className="text-xl font-bold tabular text-primary">{money(s.grandTotal)}</span>
      </div>

      {s.pledges.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pledges</h2>
          <table className="w-full text-sm">
            <tbody>
              {s.pledges.map((p, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1.5">{p.purpose}</td>
                  <td className="py-1.5 text-right tabular">{money(p.paid)} of {money(p.amount)}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{p.balance ? `${money(p.balance)} to go` : "Fulfilled. Thank you!"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {s.donations.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Project contributions</h2>
          <table className="w-full text-sm"><tbody>
            {s.donations.map((d, i) => (
              <tr key={i} className="border-b last:border-0"><td className="py-1.5">{date(d.date)}</td><td className="py-1.5">{d.campaign}{d.inKind ? ` (in kind: ${d.inKind})` : ""}</td><td className="py-1.5 text-right tabular">{d.inKind ? (d.inKindValue ? `value ${money(d.inKindValue)}` : "in kind") : money(d.amount)}</td></tr>
            ))}
          </tbody></table>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Offerings ({s.gifts.length})</h2>
        <table className="w-full text-[13px]">
          <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-1.5 font-medium">Date</th><th className="font-medium">Type</th><th className="font-medium">Service</th><th className="font-medium">Ref.</th><th className="text-right font-medium">Amount</th></tr></thead>
          <tbody>
            {s.gifts.map((g, i) => (
              <tr key={i} className="border-b border-border/60 last:border-0">
                <td className="py-1">{date(g.date)}</td>
                <td>{titleCase(g.category)}{g.pledgePurpose ? ` (${g.pledgePurpose})` : ""}</td>
                <td className="text-muted-foreground">{g.service ?? "—"}</td>
                <td className="font-mono text-[11px] text-muted-foreground">{g.reference}</td>
                <td className="text-right tabular">{money(g.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-12 grid grid-cols-2 gap-10 text-sm">
        <div><div className="mb-2 border-b border-foreground/40 pb-6" /><p className="text-muted-foreground">Treasurer</p></div>
        <div><div className="mb-2 border-b border-foreground/40 pb-6" /><p className="text-muted-foreground">Vicar / Pastor</p></div>
      </footer>
    </article>
  )
}

export default function StatementPrintPage() {
  return (
    <Suspense>
      <Statements />
    </Suspense>
  )
}

/** A whole calendar year prints as "2026"; anything else as its dates. */
const isWholeYear = (s: GivingStatement) => !s.from || (s.from.endsWith("-01-01") && s.to === `${s.from.slice(0, 4)}-12-31`)
const periodOf = (s: GivingStatement) => (isWholeYear(s) ? String(s.year) : rangeLabel({ from: s.from ?? null, to: s.to ?? null }))
