"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { date, money } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import type { PayrollRun, PayslipT } from "@/lib/types"

const month = (p: string | null) => (p ? new Date(`${p}-01T00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "")

function Slip({ s, period, church, diocese }: { s: PayslipT; period: string | null; church: string; diocese: string | null }) {
  const earnings = s.lines.filter((l) => l.kind === "earning")
  const deductions = s.lines.filter((l) => l.kind === "deduction")
  const row = (label: string, v: number, strong?: boolean) => <tr className={strong ? "font-semibold" : ""}><td className="py-1">{label}</td><td className="py-1 text-right tabular">{money(v)}</td></tr>
  return (
    <article className="mx-auto max-w-2xl break-after-page rounded-2xl bg-card p-8 shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
      <header className="flex items-start justify-between border-b pb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{church}</p>
          {diocese && <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{diocese}</p>}
          <h1 className="mt-2 text-xl font-semibold">Payslip · {month(period ?? s.period)}</h1>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{s.name}</p>
          <p className="text-muted-foreground">{s.role ?? ""}</p>
          {(s.tin || s.nssfNumber) && <p className="text-xs text-muted-foreground">{s.tin ? `TIN ${s.tin}` : ""}{s.tin && s.nssfNumber ? " · " : ""}{s.nssfNumber ? `NSSF ${s.nssfNumber}` : ""}</p>}
        </div>
      </header>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Earnings</h2>
          <table className="w-full text-sm"><tbody>{earnings.map((l, i) => <tr key={i}><td className="py-1">{l.name}</td><td className="py-1 text-right tabular">{money(l.amount)}</td></tr>)}</tbody>
            <tfoot className="border-t">{row("Gross pay", s.gross, true)}</tfoot></table>
        </section>
        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Deductions</h2>
          <table className="w-full text-sm"><tbody>
            {s.nssfOn && row("NSSF (5%)", s.nssfEmployee)}
            {s.payeOn && row("PAYE", s.paye)}
            {deductions.map((l, i) => <tr key={i}><td className="py-1">{l.name}</td><td className="py-1 text-right tabular">{money(l.amount)}</td></tr>)}
            {!s.nssfOn && !s.payeOn && deductions.length === 0 && <tr><td className="py-1 text-muted-foreground">None</td><td /></tr>}
          </tbody><tfoot className="border-t">{row("Total deductions", s.nssfEmployee + s.paye + s.deductions, true)}</tfoot></table>
        </section>
      </div>
      <div className="mt-6 flex items-center justify-between rounded-xl bg-primary/8 px-5 py-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Net pay</p><p className="text-xs text-muted-foreground">{s.paymentMethod}{s.account ? ` · ${s.account}` : ""}{s.paidOn ? ` · paid ${date(s.paidOn)}` : ""}</p></div>
        <p className="text-2xl font-bold tabular text-primary">{money(s.net)}</p>
      </div>
      {s.nssfOn && <p className="mt-3 text-xs text-muted-foreground">The church also contributes {money(s.nssfEmployer)} (10%) to your NSSF account.</p>}
      <footer className="mt-10 grid grid-cols-2 gap-8 text-xs text-muted-foreground">
        <div><div className="mb-1 border-b border-foreground/30 pb-4" />Treasurer</div>
        <div><div className="mb-1 border-b border-foreground/30 pb-4" />Received by</div>
      </footer>
    </article>
  )
}

function Payslips() {
  const params = useSearchParams()
  const id = params.get("id")
  const runId = params.get("run")
  const router = useRouter()
  const { user, loading } = useAuth()
  const settings = useSettings()
  const { data: one } = useApi<PayslipT>(user && id ? `/payroll/slips/${id}` : null)
  const { data: run } = useApi<PayrollRun>(user && runId ? `/payroll/runs/${runId}` : null)
  useEffect(() => { if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(`/payroll/payslip?${params.toString()}`)}`) }, [loading, user, router, params])
  const slips = one ? [one] : run?.slips ?? null
  if (!slips) return <div className="m-10 h-[600px] animate-pulse rounded-2xl bg-muted" />
  return (
    <div className="min-h-screen space-y-8 bg-secondary/50 px-4 py-8 print:space-y-0 print:bg-white print:p-0">
      <style>{"@page { size: A4; margin: 16mm; }"}</style>
      <div className="mx-auto flex max-w-2xl justify-between print:hidden">
        <p className="text-sm text-muted-foreground">{slips.length} payslip{slips.length === 1 ? "" : "s"}{run ? ` · ${month(run.period)}` : ""}{run && run.status !== "paid" ? " · draft, not yet paid" : ""}</p>
        <Button onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
      </div>
      {slips.map((s) => <Slip key={s.id} s={s} period={run?.period ?? s.period} church={settings.churchName} diocese={settings.diocese} />)}
    </div>
  )
}

export default function PayslipPage() {
  return <Suspense><Payslips /></Suspense>
}
