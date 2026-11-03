"use client"

import Link from "next/link"
import { useState } from "react"
import { Printer, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Page, PageHeader } from "@/components/page"
import { LedgerDialog } from "@/components/bookkeeping"
import { BalanceSheetView, IncomeStatementView, Notices, TrialBalanceView, csv, downloadCsv } from "@/components/financial-statements"
import { qs, useApi } from "@/lib/api"
import { useSettings } from "@/lib/settings"
import { useUrlParam } from "@/lib/use-url-param"
import { usePeriod } from "@/lib/period"
import { PeriodFilter, asOfDate } from "@/components/period-filter"
import { today } from "@/lib/format"
import type { BalanceSheet, IncomeStatement, TrialBalance } from "@/lib/types"

export function AccountingContent() {
  const settings = useSettings()
  const [tab, setTab] = useState("balance-sheet")
  useUrlParam("tab", setTab)
  const [ledger, setLedger] = useState<{ id: string; from?: string; to?: string } | null>(null)

  return (
    <Page>
      <PageHeader
        eyebrow="Stewardship"
        title="Financial reports"
        description="Balance sheet, income statement and trial balance, built automatically from the offertory book, Accounts transactions and journal entries. Click any account to see every entry behind it."
      />
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="balance-sheet">Balance sheet</TabsTrigger>
          <TabsTrigger value="income">Income statement</TabsTrigger>
          <TabsTrigger value="trial-balance">Trial balance</TabsTrigger>
        </TabsList>
        <TabsContent value="balance-sheet"><BalanceSheetTab church={settings.churchName} onAccount={(id) => setLedger({ id })} /></TabsContent>
        <TabsContent value="income"><IncomeTab church={settings.churchName} onAccount={(id, from, to) => setLedger({ id, from, to })} /></TabsContent>
        <TabsContent value="trial-balance"><TrialBalanceTab church={settings.churchName} onAccount={(id) => setLedger({ id })} /></TabsContent>
      </Tabs>
      {ledger && <LedgerDialog {...ledger} open onOpenChange={(o) => !o && setLedger(null)} />}
    </Page>
  )
}

function Toolbar({ children, printHref, onCsv }: { children: React.ReactNode; printHref: string; onCsv?: () => void }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap items-end gap-3">{children}</div>
      <div className="flex gap-2">
        <Button variant="outline" disabled={!onCsv} onClick={onCsv}><Download className="size-4" /> Excel (CSV)</Button>
        <Button variant="outline" asChild><Link href={printHref} target="_blank"><Printer className="size-4" /> Print</Link></Button>
      </div>
    </div>
  )
}

function Loading() {
  return <div className="h-96 animate-pulse rounded-2xl bg-muted" />
}

function BalanceSheetTab({ church, onAccount }: { church: string; onAccount: (id: string) => void }) {
  const period = usePeriod("this_year")
  const asOf = asOfDate(period)
  const { data } = useApi<BalanceSheet>(qs("/accounting/balance-sheet", { asOf }))
  return (
    <div className="space-y-4">
      <Toolbar printHref={`/accounting/print?report=bs&asOf=${asOf}`} onCsv={data && (() => downloadCsv(`balance-sheet-${asOf}.csv`, csv.balanceSheet(data)))}>
        <PeriodFilter period={period} asOf />
      </Toolbar>
      {data && <Notices balanced={data.balanced} warnings={data.warnings} notes={data.notes} unmapped={data.unmapped} />}
      {data ? <BalanceSheetView data={data} church={church} onAccount={onAccount} /> : <Loading />}
    </div>
  )
}

function IncomeTab({ church, onAccount }: { church: string; onAccount: (id: string, from: string, to: string) => void }) {
  const period = usePeriod("this_year")
  const from = period.range.from ?? undefined
  const to = period.range.to ?? today()
  const [byFund, setByFund] = useState(true)
  const { data } = useApi<IncomeStatement>(qs("/accounting/income-statement", { from, to }))
  return (
    <div className="space-y-4">
      <Toolbar printHref={`/accounting/print?report=is&from=${data?.from ?? ""}&to=${to}&byFund=${byFund ? 1 : 0}`}
        onCsv={data && (() => downloadCsv(`income-statement-${data.from}-to-${data.to}.csv`, csv.incomeStatement(data)))}>
        <PeriodFilter period={period} />
        <div className="flex items-center gap-2 pb-2"><Switch id="is-fund" checked={byFund} onCheckedChange={setByFund} /><Label htmlFor="is-fund">Split by fund</Label></div>
      </Toolbar>
      {data && <Notices balanced unmapped={data.unmapped} />}
      {data ? <IncomeStatementView data={data} church={church} byFund={byFund} onAccount={(id) => onAccount(id, data.from, data.to)} /> : <Loading />}
    </div>
  )
}

function TrialBalanceTab({ church, onAccount }: { church: string; onAccount: (id: string) => void }) {
  const period = usePeriod("this_year")
  const asOf = asOfDate(period)
  const { data } = useApi<TrialBalance>(qs("/accounting/trial-balance", { asOf }))
  return (
    <div className="space-y-4">
      <Toolbar printHref={`/accounting/print?report=tb&asOf=${asOf}`} onCsv={data && (() => downloadCsv(`trial-balance-${asOf}.csv`, csv.trialBalance(data)))}>
        <PeriodFilter period={period} asOf />
      </Toolbar>
      {data && <Notices balanced={data.balanced} unmapped={data.unmapped} />}
      {data ? <TrialBalanceView data={data} church={church} onAccount={onAccount} /> : <Loading />}
    </div>
  )
}

