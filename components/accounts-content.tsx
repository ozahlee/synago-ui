"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowDownLeft, ArrowUpRight, Plus, Minus, TrendingUp, Scale } from "lucide-react"
import { Page, PageHeader, StatCard } from "@/components/page"
import { TransactionsTable } from "@/components/transactions-table"
import { TransactionFormDialog } from "@/components/transaction-form-dialog"
import { AccountsChart } from "@/components/accounts-chart"
import { ChartOfAccounts, JournalEntries, LedgerDialog } from "@/components/bookkeeping"
import { qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { money } from "@/lib/format"
import { usePeriod } from "@/lib/period"
import { useUrlParam } from "@/lib/use-url-param"
import { PeriodFilter, periodParams } from "@/components/period-filter"
import type { AccountsSummary } from "@/lib/types"

const SECTIONS = {
  transactions: "Everything that comes in and goes out, day to day.",
  journals: "Entries the day-to-day books don't capture: opening balances, banking cash, assets, loans, depreciation.",
  chart: "The accounts every entry posts to, and the rules that link offertory and Accounts categories to them.",
} as const
type Section = keyof typeof SECTIONS

/** Accounts: day-to-day transactions, journal entries and the chart of accounts, in one place. */
export function AccountsContent() {
  const { can } = useAuth()
  const [section, setSection] = useState<Section>("transactions")
  useUrlParam("tab", (t) => t in SECTIONS && setSection(t as Section))
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<"income" | "expense">("income")
  const [ledger, setLedger] = useState<string | null>(null)

  const handleAddTransaction = (type: "income" | "expense") => {
    setTransactionType(type)
    setIsAddDialogOpen(true)
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Stewardship"
        title="Accounts"
        description={SECTIONS[section]}
        actions={
          section === "transactions" && can("finance.manage") && (
            <>
              <Button variant="outline" onClick={() => handleAddTransaction("expense")}>
                <Minus className="size-4" />
                Add expense
              </Button>
              <Button onClick={() => handleAddTransaction("income")}>
                <Plus className="size-4" />
                Add income
              </Button>
            </>
          )
        }
      />

      <Tabs value={section} onValueChange={(v) => setSection(v as Section)} className="gap-5">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="journals">Journal entries</TabsTrigger>
          <TabsTrigger value="chart">Chart of accounts</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions" className="space-y-6"><Transactions /></TabsContent>
        <TabsContent value="journals"><JournalEntries /></TabsContent>
        <TabsContent value="chart"><ChartOfAccounts onAccount={setLedger} /></TabsContent>
      </Tabs>

      <TransactionFormDialog
        key={transactionType}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        defaultType={transactionType}
      />
      {ledger && <LedgerDialog id={ledger} open onOpenChange={(o) => !o && setLedger(null)} />}
    </Page>
  )
}

function Transactions() {
  const [activeTab, setActiveTab] = useState("all")
  const period = usePeriod("this_month")
  const { data: month } = useApi<AccountsSummary>(qs("/accounts/summary", periodParams(period)))
  const when = period.label.toLowerCase()
  const { data: overall } = useApi<AccountsSummary>("/accounts/summary")
  const net = month?.balance

  return (
    <>
      <PeriodFilter period={period} allowAll />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Income · ${when}`} icon={ArrowDownLeft} tone="success" value={month && money(month.income)} />
        <StatCard label={`Expenses · ${when}`} icon={ArrowUpRight} tone="danger" value={month && money(month.expense)} />
        <StatCard
          label={`Net · ${when}`}
          icon={TrendingUp}
          tone={(net ?? 0) >= 0 ? "success" : "danger"}
          value={net === undefined ? undefined : money(net)}
          valueClassName={(net ?? 0) >= 0 ? "text-success" : "text-destructive"}
          hint={net === undefined ? undefined : net >= 0 ? "Surplus" : "Deficit"}
        />
        <StatCard
          label="Overall balance"
          icon={Scale}
          tone="gold"
          value={overall && money(overall.balance)}
          hint="All income minus all expenses"
        />
      </section>

      <AccountsChart />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expense">Expenses</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          <TransactionsTable type={activeTab} from={period.range.from} to={period.range.to} />
        </TabsContent>
      </Tabs>
    </>
  )
}
