"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BalanceSheetView, IncomeStatementView, TrialBalanceView } from "@/components/financial-statements"
import { qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { longDate, today } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import type { BalanceSheet, IncomeStatement, TrialBalance } from "@/lib/types"

/** Printable financial statements for the church council / vestry: ?report=bs|is|tb */
function Statement() {
  const params = useSearchParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const settings = useSettings()
  const report = params.get("report") ?? "bs"
  const asOf = params.get("asOf") ?? today()
  const from = params.get("from") ?? undefined
  const to = params.get("to") ?? today()
  const bs = useApi<BalanceSheet>(user && report === "bs" ? qs("/accounting/balance-sheet", { asOf }) : null)
  const is = useApi<IncomeStatement>(user && report === "is" ? qs("/accounting/income-statement", { from, to }) : null)
  const tb = useApi<TrialBalance>(user && report === "tb" ? qs("/accounting/trial-balance", { asOf }) : null)

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(`/accounting/print?${params.toString()}`)}`)
  }, [loading, user, router, params])

  const church = settings.churchName
  const body = report === "is" ? is.data && <IncomeStatementView data={is.data} church={church} byFund={params.get("byFund") !== "0"} />
    : report === "tb" ? tb.data && <TrialBalanceView data={tb.data} church={church} />
      : bs.data && <BalanceSheetView data={bs.data} church={church} />

  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">Prints on A4. Add signatures below for the council.</p>
        <Button onClick={() => window.print()} disabled={!body}><Printer className="size-4" /> Print</Button>
      </div>
      <div className="mx-auto max-w-4xl">
        {body || <div className="h-96 animate-pulse rounded-2xl bg-muted" />}
        {body && (
          <div className="mt-6 grid grid-cols-3 gap-8 rounded-2xl bg-card p-8 text-sm shadow-soft print:rounded-none print:p-0 print:pt-12 print:shadow-none">
            {["Treasurer", "Vicar / Pastor", "Chairperson, church council"].map((r) => (
              <div key={r}><div className="h-10 border-b border-foreground/40" /><p className="mt-1 text-muted-foreground">{r}</p><p className="text-xs text-muted-foreground">Date: ____________</p></div>
            ))}
          </div>
        )}
        <p className="mt-4 text-center text-xs text-muted-foreground">Printed {longDate(today())} from Synago</p>
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense><Statement /></Suspense>
}
