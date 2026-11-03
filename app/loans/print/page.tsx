"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { acct } from "@/components/financial-statements"
import { METHOD_LABEL } from "@/components/loans-content"
import { useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { CURRENCY, date, longDate, today } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import type { LoanDetail } from "@/lib/types"

/** Loan statement for the church council: terms, approval, where repayment stands, schedule and repayments. */
function Statement() {
  const id = useSearchParams().get("id")
  const router = useRouter()
  const { user, loading } = useAuth()
  const settings = useSettings()
  const { data: l } = useApi<LoanDetail>(user && id ? `/loans/${id}` : null)
  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(`/loans/print?id=${id}`)}`)
  }, [loading, user, router, id])
  if (!l) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Preparing the statement…</div>
  const s = l.summary
  const unit = l.frequency === "monthly" ? "months" : "quarters"
  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">Prints on A4 for the church council.</p>
        <Button onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
      </div>
      <article className="mx-auto max-w-4xl rounded-2xl bg-card p-8 shadow-soft print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="mb-6 border-b pb-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{settings.churchName}</p>
          <h1 className="mt-1 text-2xl font-semibold">Loan statement</h1>
          <p className="text-sm text-muted-foreground">{l.lender} · {l.purpose} ({l.project}) · as at {longDate(today())}</p>
          <p className="text-xs text-muted-foreground">Amounts in {CURRENCY}</p>
        </header>

        <section className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
          {[
            ["Amount borrowed", acct(l.principal)], ["Interest", `${METHOD_LABEL[l.interestMethod]}${l.interestMethod !== "none" ? `, ${l.annualRate}% a year` : ""}`],
            ["Term", `${l.termPeriods} ${unit}${l.gracePeriods ? ` + ${l.gracePeriods} interest-only` : ""}, from ${longDate(l.startDate)}`], ["Loan account", l.accountNumber ?? "—"],
            ["Council approval", l.approvalRef ? `${l.approvalRef}${l.approvedOn ? `, ${longDate(l.approvedOn)}` : ""}` : "—"], ["Consent", l.consentRef ?? "—"],
            ["Security", l.security ?? "—"], ["Guarantors", l.guarantors ?? "—"],
          ].map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-dashed py-1"><span className="text-muted-foreground">{k}</span><span className="text-right">{v}</span></div>)}
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Received", s.disbursed], ["Principal repaid", s.principalPaid], ["Interest paid", s.interestPaid + s.feesPaid], ["Still owed", s.outstanding + s.undrawn]].map(([k, v]) => (
            <div key={k as string} className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="text-lg font-semibold tabular">{acct(v as number)}</p></div>
          ))}
        </section>
        {s.arrears.count > 0 && <p className="mt-3 text-sm font-medium text-destructive">In arrears: {acct(s.arrears.amount)} ({s.arrears.count} instalment{s.arrears.count === 1 ? "" : "s"} since {longDate(s.arrears.since)}).</p>}

        <h2 className="mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Repayment schedule</h2>
        <table className="mt-2 w-full text-sm">
          <thead><tr className="border-b text-xs text-muted-foreground"><th className="py-1.5 text-left font-medium">No.</th><th className="text-left font-medium">Due</th><th className="text-right font-medium">Principal</th><th className="text-right font-medium">Interest</th><th className="text-right font-medium">Instalment</th><th className="text-right font-medium">Status</th></tr></thead>
          <tbody>
            {s.installments.map((i) => (
              <tr key={i.number} className="border-b border-dashed">
                <td className="py-1 tabular">{i.number}</td><td>{date(i.dueDate)}</td><td className="text-right tabular">{acct(i.principal)}</td>
                <td className="text-right tabular">{acct(i.interest)}</td><td className="text-right font-medium tabular">{acct(i.amount)}</td>
                <td className={`text-right ${i.status === "overdue" ? "text-destructive" : i.status === "paid" ? "text-success" : "text-muted-foreground"}`}>{i.status === "due" ? "to pay" : i.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {l.payments.length > 0 && (
          <>
            <h2 className="mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Repayments made</h2>
            <table className="mt-2 w-full text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="py-1.5 text-left font-medium">Date</th><th className="text-left font-medium">Reference</th><th className="text-right font-medium">Principal</th><th className="text-right font-medium">Interest & fees</th><th className="text-right font-medium">Paid</th></tr></thead>
              <tbody>
                {[...l.payments].reverse().map((p) => (
                  <tr key={p.id} className="border-b border-dashed"><td className="py-1">{date(p.date)}</td><td className="font-mono text-xs">{p.reference ?? ""}</td><td className="text-right tabular">{acct(p.principal)}</td><td className="text-right tabular">{acct(p.interest + p.fees)}</td><td className="text-right font-medium tabular">{acct(p.amount)}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="mt-12 grid grid-cols-3 gap-8 text-sm">
          {["Treasurer", "Vicar / Pastor", "Chairperson, church council"].map((r) => <div key={r}><div className="h-10 border-b border-foreground/40" /><p className="mt-1 text-muted-foreground">{r}</p></div>)}
        </div>
      </article>
    </div>
  )
}

export default function Page() {
  return <Suspense><Statement /></Suspense>
}
