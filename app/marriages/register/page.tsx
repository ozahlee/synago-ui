"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { qs, usePaginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { date as fmtDate } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import type { Marriage } from "@/lib/types"

/** The marriage register for a year, in the order the weddings took place, for the parish records or the diocese. */
function Register() {
  const params = useSearchParams()
  const router = useRouter()
  const year = Number(params.get("year")) || new Date().getFullYear()
  const { user, loading } = useAuth()
  const settings = useSettings()
  const { rows, isLoading } = usePaginated<Marriage>(user ? qs("/marriages", { status: "completed", from: `${year}-01-01`, to: `${year}-12-31`, perPage: 100 }) : null)
  const list = rows.filter((m) => m.date.startsWith(String(year))).sort((a, b) => a.date.localeCompare(b.date))

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(`/marriages/register?year=${year}`)}`)
  }, [loading, user, router, year])

  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-5xl flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Year</span>
          <Input type="number" min="1900" max="2100" value={year} onChange={(e) => e.target.value && router.replace(`/marriages/register?year=${e.target.value}`)} className="h-9 w-28" />
        </div>
        <Button onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
      </div>
      <article className="mx-auto max-w-5xl rounded-sm bg-card p-8 shadow-xl print:max-w-none print:p-0 print:shadow-none">
        <header className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{settings.churchName}</p>
          {settings.diocese && <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{settings.diocese}</p>}
          <h1 className="mt-2 text-2xl font-semibold">Register of Marriages · {year}</h1>
        </header>
        {isLoading ? <div className="h-60 animate-pulse rounded-xl bg-muted" /> : list.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">No marriages solemnised in {year}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3">No.</th><th className="pr-3">Date</th><th className="pr-3">Groom</th><th className="pr-3">Bride</th>
                  <th className="pr-3">Place</th><th className="pr-3">Officiant</th><th className="pr-3">Witnesses</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className="break-inside-avoid border-b align-top">
                    <td className="py-2 pr-3 font-mono text-xs">{m.certificateNumber ?? "—"}</td>
                    <td className="pr-3 whitespace-nowrap">{fmtDate(m.date)}</td>
                    <td className="pr-3 font-medium">{m.groomName}</td>
                    <td className="pr-3 font-medium">{m.brideName}</td>
                    <td className="pr-3">{m.place ?? "—"}</td>
                    <td className="pr-3">{m.officiant ?? "—"}</td>
                    <td className="pr-3">{m.witnesses ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-muted-foreground">{list.length} marriage{list.length === 1 ? "" : "s"} solemnised in {year}.</p>
          </div>
        )}
        <footer className="mt-12 grid grid-cols-2 gap-8 text-sm">
          <div><div className="mb-2 border-b border-foreground/40 pb-1">&nbsp;</div><p className="text-muted-foreground">Vicar / Minister in charge</p></div>
          <div><div className="mb-2 border-b border-foreground/40 pb-1">&nbsp;</div><p className="text-muted-foreground">Church stamp &amp; date</p></div>
        </footer>
      </article>
    </div>
  )
}

export default function MarriageRegisterPage() {
  return <Suspense><Register /></Suspense>
}
