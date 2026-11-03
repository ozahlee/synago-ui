"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Printer, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { longDate, today } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import type { Placement } from "@/lib/types"

/** Printable documents for a placement: the report for the institution, or a letter of appreciation for the student. */
function Doc() {
  const params = useSearchParams()
  const id = params.get("id")
  const doc = params.get("doc") === "letter" ? "letter" : "report"
  const router = useRouter()
  const { user, loading } = useAuth()
  const settings = useSettings()
  const { data: p } = useApi<Placement>(user && id ? `/placements/${id}` : null)
  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(`/guests/print?${params.toString()}`)}`)
  }, [loading, user, router, params])
  if (!p) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Preparing…</div>
  const first = p.name.split(" ")[0]
  const period = `${longDate(p.startDate)}${p.endDate ? ` to ${longDate(p.endDate)}` : ""}`
  const kind = p.kind === "teaching" ? "teaching practice" : "ministry placement"
  const serving = p.assignments.map((a) => a.area + (a.detail ? ` (${a.detail})` : "")).join(", ")

  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">Prints on A4 with the church&apos;s name. Sign and stamp after printing.</p>
        <Button onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
      </div>
      <article className="mx-auto max-w-3xl rounded-2xl bg-card p-12 font-serif text-[15px] leading-relaxed shadow-soft print:max-w-none print:rounded-none print:p-10 print:shadow-none">
        <header className="mb-8 border-b-2 border-primary pb-4 text-center font-sans">
          <p className="text-xl font-semibold text-primary">{settings.churchName}</p>
          <p className="text-sm text-muted-foreground">{[settings.diocese, settings.address].filter(Boolean).join(" · ")}</p>
        </header>
        <p className="text-right">{longDate(today())}</p>

        {doc === "letter" ? (
          <>
            <p className="mt-6">Dear {p.name},</p>
            <h1 className="mt-4 font-sans text-lg font-semibold">Letter of appreciation</h1>
            <p className="mt-4">On behalf of the church council and the whole congregation of {settings.churchName}, we thank you for the time you spent with us on your {kind} from {period}.</p>
            {serving && <p className="mt-3">You served faithfully in {serving}, and your work blessed many among us{p.mentor ? `, as ${p.mentor} and others have testified` : ""}.</p>}
            <p className="mt-3">As you return to {p.institution}{p.course ? ` to continue your ${p.course}` : ""}, we pray that the Lord will guide your studies and your calling. You will always be welcome here.</p>
            <p className="mt-3 italic">&ldquo;I thank my God every time I remember you.&rdquo; (Philippians 1:3)</p>
            <p className="mt-8">With love and blessings,</p>
          </>
        ) : (
          <>
            <p className="mt-6">To the supervisor{p.supervisor ? `, ${p.supervisor}` : ""},<br />{p.institution}</p>
            <h1 className="mt-4 font-sans text-lg font-semibold">Placement report: {p.name}</h1>
            <table className="mt-4 w-full font-sans text-sm">
              <tbody>
                {[["Student", p.name], ["Course", p.course ?? "—"], ["Placement", `${p.kind === "teaching" ? "Teaching practice" : "Ministry placement"}, ${period}${p.weeks ? ` (${p.weeks} weeks)` : ""}`],
                  ["Served in", serving || "—"], ["Church mentor", p.mentor ?? "—"]].map(([k, v]) => (
                  <tr key={k} className="border-b"><td className="w-40 py-1.5 text-muted-foreground">{k}</td><td className="py-1.5">{v}</td></tr>
                ))}
                <tr className="border-b"><td className="py-1.5 text-muted-foreground">Overall rating</td><td className="py-1.5"><span className="inline-flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`size-4 ${(p.rating ?? 0) >= n ? "fill-gold text-gold" : "text-muted-foreground/40"}`} />)}</span>{p.rating ? ` ${p.rating} / 5` : " not rated"}</td></tr>
              </tbody>
            </table>
            <h2 className="mt-6 font-sans text-sm font-semibold uppercase tracking-wider text-muted-foreground">Comments</h2>
            <p className="mt-2 min-h-24 whitespace-pre-line">{p.report || `${first} served with us during the period above.`}</p>
          </>
        )}

        <div className="mt-14 grid grid-cols-2 gap-12 font-sans text-sm">
          <div><div className="h-12 border-b border-foreground/40" /><p className="mt-1">{doc === "letter" ? "Vicar / Pastor" : `Mentor${p.mentor ? `: ${p.mentor}` : ""}`}</p></div>
          <div><div className="h-12 border-b border-foreground/40" /><p className="mt-1">{doc === "letter" ? "Chairperson, church council" : "Vicar / Pastor"}</p><p className="text-xs text-muted-foreground">Church stamp</p></div>
        </div>
      </article>
    </div>
  )
}

export default function Page() {
  return <Suspense><Doc /></Suspense>
}
