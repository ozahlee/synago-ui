"use client"

import { AlertTriangle, CheckCircle2, Info } from "lucide-react"
import { CURRENCY, longDate } from "@/lib/format"
import type { AccountMappings, BalanceSheet, IncomeStatement, IncomeStatementSection, TrialBalance } from "@/lib/types"
import { cn } from "@/lib/utils"

const whole = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 })
const cents = new Intl.NumberFormat("en-UG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt = (n: number) => (Math.abs(n - Math.round(n)) < 0.005 ? whole.format(n) : cents.format(n))
/** Accounting style: thousands separators, two decimals when there are cents, negatives in brackets, zero as a dash. */
export const acct = (n: number | null | undefined) => (!n ? "–" : n < 0 ? `(${fmt(-n)})` : fmt(n))

type OnAccount = ((accountId: string) => void) | undefined

/** The paper-like frame every statement sits in: church, title, date, currency note. */
export function Sheet({ church, title, subtitle, children, className }: { church: string; title: string; subtitle: string; children: React.ReactNode; className?: string }) {
  return (
    <article className={cn("rounded-2xl border bg-card p-6 shadow-soft sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none", className)}>
      <header className="mb-6 border-b pb-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{church}</p>
        <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">Amounts in {CURRENCY}</p>
      </header>
      {children}
    </article>
  )
}

function Row({ label, code, cells, onClick, strong, indent, rule }: {
  label: React.ReactNode; code?: string; cells: Array<number | null | undefined | string>; onClick?: () => void; strong?: boolean; indent?: boolean; rule?: "single" | "double"
}) {
  return (
    <tr className={cn(onClick && "cursor-pointer hover:bg-muted/60", strong && "font-semibold")} onClick={onClick}>
      <td className={cn("py-1.5 pr-3", indent && "pl-4")}>
        {code && <span className="mr-2 font-mono text-xs text-muted-foreground">{code}</span>}
        <span className={cn(onClick && "underline-offset-2 hover:underline")}>{label}</span>
      </td>
      {cells.map((c, i) => (
        <td key={i} className={cn("py-1.5 pl-3 text-right tabular whitespace-nowrap",
          rule === "single" && "border-t border-foreground/40", rule === "double" && "border-t border-b-4 border-double border-foreground/60",
          typeof c === "number" && c < 0 && "text-destructive")}>
          {typeof c === "string" ? c : c === undefined ? "" : acct(c)}
        </td>
      ))}
    </tr>
  )
}

function Heading({ children, cols }: { children: React.ReactNode; cols: number }) {
  return <tr><td colSpan={cols + 1} className="pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</td></tr>
}

export function Notices({ balanced, warnings = [], notes = [], unmapped }: { balanced: boolean; warnings?: string[]; notes?: string[]; unmapped?: AccountMappings["unmapped"] }) {
  const um = Object.entries(unmapped ?? {}).flatMap(([src, keys]) => (keys ?? []).map((k) => `${k} (${src.replace("_", " ")})`))
  return (
    <div className="space-y-2 print:hidden">
      {!balanced && <p className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertTriangle className="size-4" /> The statement does not balance. Check the most recent journals.</p>}
      {notes.map((n) => <p key={n} className="flex items-start gap-2 rounded-xl border bg-muted/60 px-3 py-2 text-sm text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" />{n}</p>)}
      {warnings.map((w) => <p key={w} className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />{w}</p>)}
      {um.length > 0 && (
        <p className="flex items-start gap-2 rounded-xl border bg-muted px-3 py-2 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>Not yet linked to an account, so posted to Other income / Other expenses / Cash: {um.join(", ")}. Link them under Accounts → Chart of accounts → How records post.</span>
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- balance sheet

export function BalanceSheetView({ data, church, onAccount }: { data: BalanceSheet; church: string; onAccount?: OnAccount }) {
  const click = (id: string) => (onAccount ? () => onAccount(id) : undefined)
  return (
    <Sheet church={church} title="Statement of financial position" subtitle={`Balance sheet as at ${longDate(data.asOf)}`}>
      <table className="w-full text-sm">
        <thead><tr className="text-xs text-muted-foreground"><th /><th className="w-36 pl-3 text-right font-medium">{CURRENCY}</th></tr></thead>
        <tbody>
          <Heading cols={1}>Assets</Heading>
          {data.assets.fixed.length > 0 && <>
            <Row label="Fixed assets" cells={[""]} strong />
            {data.assets.fixed.map((a) => <Row key={a.id} indent code={a.code} label={a.name} cells={[a.amount]} onClick={click(a.id)} />)}
            <Row label="" cells={[data.assets.fixedTotal]} rule="single" />
          </>}
          <Row label="Current assets" cells={[""]} strong />
          {data.assets.current.map((a) => <Row key={a.id} indent code={a.code} label={a.name} cells={[a.amount]} onClick={click(a.id)} />)}
          <Row label="" cells={[data.assets.currentTotal]} rule="single" />
          <Row label="Total assets" cells={[data.assets.total]} strong rule="single" />

          {data.liabilities.rows.length > 0 && <>
            <Heading cols={1}>Liabilities</Heading>
            {data.liabilities.rows.map((a) => <Row key={`${a.id}-${a.name}`} indent code={a.code} label={a.name} cells={[a.amount]} onClick={click(a.id)} />)}
            <Row label="Total liabilities" cells={[data.liabilities.total]} strong rule="single" />
          </>}
          <Row label="Net assets" cells={[data.netAssets]} strong rule="double" />

          <Heading cols={1}>Funds</Heading>
          {data.funds.rows.filter((f) => !f.restricted).map((f) => <Row key={f.key} indent label={f.name} cells={[f.amount]} />)}
          {data.funds.rows.some((f) => f.restricted) && <>
            <Row label="Restricted funds" cells={[""]} strong />
            {data.funds.rows.filter((f) => f.restricted).map((f) => <Row key={f.key} indent label={f.name} cells={[f.amount]} />)}
            <Row label="" cells={[data.funds.restricted]} rule="single" />
          </>}
          <Row label="Total funds" cells={[data.funds.total]} strong rule="double" />
        </tbody>
      </table>

      <h3 className="mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Movement in funds</h3>
      <table className="mt-2 w-full text-sm">
        <thead><tr className="border-b text-xs text-muted-foreground">
          <th className="py-1.5 text-left font-medium">Fund</th>
          <th className="pl-3 text-right font-medium">At {longDate(data.yearStart)}</th>
          <th className="pl-3 text-right font-medium">Surplus / (deficit)</th>
          <th className="pl-3 text-right font-medium">At {longDate(data.asOf)}</th>
        </tr></thead>
        <tbody>
          {data.funds.rows.map((f) => <Row key={f.key} label={f.name} cells={[f.opening, f.movement, f.amount]} />)}
          <Row label="Total" strong rule="single" cells={[data.funds.rows.reduce((s, f) => s + f.opening, 0), data.funds.rows.reduce((s, f) => s + f.movement, 0), data.funds.total]} />
        </tbody>
      </table>
      <Balanced ok={data.balanced} text="Net assets equal total funds" />
    </Sheet>
  )
}

function Balanced({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p className={cn("mt-6 flex items-center justify-center gap-1.5 text-xs", ok ? "text-success" : "text-destructive")}>
      {ok ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}{ok ? text : "Does not balance"}
    </p>
  )
}

// ---------------------------------------------------------------- income statement

export function IncomeStatementView({ data, church, onAccount, byFund = true }: { data: IncomeStatement; church: string; onAccount?: OnAccount; byFund?: boolean }) {
  const hasBudget = data.expenses.total.budget != null
  const cols = (r: { general: number; restricted: number; total: number; previous: number; budget?: number | null }, withBudget = true) => [
    ...(byFund ? [r.general, r.restricted] : []), r.total, r.previous, ...(hasBudget ? [withBudget ? r.budget ?? undefined : undefined] : []),
  ]
  const n = (byFund ? 2 : 0) + 2 + (hasBudget ? 1 : 0)
  const section = (title: string, s: IncomeStatementSection, budget: boolean) => <>
    <Heading cols={n}>{title}</Heading>
    {s.rows.map((r) => <Row key={r.id} indent code={r.code} label={r.name} cells={cols(r, budget)} onClick={onAccount ? () => onAccount(r.id) : undefined} />)}
    <Row label={`Total ${title.toLowerCase()}`} strong rule="single" cells={cols(s.total, budget)} />
  </>
  const year = (d: string) => d.slice(0, 4)
  return (
    <Sheet church={church} title="Statement of financial activities" subtitle={`Income statement for ${longDate(data.from)} – ${longDate(data.to)}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="border-b text-xs text-muted-foreground">
            <th />
            {byFund && <><th className="pl-3 text-right font-medium">General</th><th className="pl-3 text-right font-medium">Restricted</th></>}
            <th className="pl-3 text-right font-medium">Total</th>
            <th className="pl-3 text-right font-medium">Same period {year(data.previousFrom)}</th>
            {hasBudget && <th className="pl-3 text-right font-medium">Budget</th>}
          </tr></thead>
          <tbody>
            {section("Income", data.income, false)}
            {section("Expenses", data.expenses, true)}
            <tr><td colSpan={n + 1} className="pt-3" /></tr>
            <Row label={data.surplus.total >= 0 ? "Surplus for the period" : "Deficit for the period"} strong rule="double"
              cells={[...(byFund ? [data.surplus.general, data.surplus.restricted] : []), data.surplus.total, data.surplus.previous, ...(hasBudget ? [undefined] : [])]} />
          </tbody>
        </table>
      </div>
      {byFund && <p className="mt-4 text-xs text-muted-foreground">Restricted = money given for a project or the welfare fund, which may only be used for that purpose. Gifts in kind are not included.</p>}
    </Sheet>
  )
}

// ---------------------------------------------------------------- trial balance

const TYPE_LABEL = { asset: "Assets", liability: "Liabilities", fund: "Funds", income: "Income", expense: "Expenses" } as const

export function TrialBalanceView({ data, church, onAccount }: { data: TrialBalance; church: string; onAccount?: OnAccount }) {
  const groups = (Object.keys(TYPE_LABEL) as Array<keyof typeof TYPE_LABEL>).map((t) => ({ t, rows: data.rows.filter((r) => r.type === t) })).filter((g) => g.rows.length)
  return (
    <Sheet church={church} title="Trial balance" subtitle={`As at ${longDate(data.asOf)} · income and expenses since ${longDate(data.yearStart)}`}>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-xs text-muted-foreground"><th className="py-1.5 text-left font-medium">Account</th><th className="w-36 pl-3 text-right font-medium">Debit</th><th className="w-36 pl-3 text-right font-medium">Credit</th></tr></thead>
        <tbody>
          {groups.map((g) => <FragmentRows key={g.t} title={TYPE_LABEL[g.t]}>
            {g.rows.map((r) => <Row key={r.id} indent code={r.code} label={r.name} cells={[r.debit, r.credit]} onClick={onAccount ? () => onAccount(r.id) : undefined} />)}
          </FragmentRows>)}
          <tr><td colSpan={3} className="pt-2" /></tr>
          <Row label="Totals" strong rule="double" cells={[data.totals.debit, data.totals.credit]} />
        </tbody>
      </table>
      <Balanced ok={data.balanced} text="Debits equal credits" />
    </Sheet>
  )
}

function FragmentRows({ title, children }: { title: string; children: React.ReactNode }) {
  return <><Heading cols={2}>{title}</Heading>{children}</>
}

// ---------------------------------------------------------------- CSV export

export function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const blob = new Blob(["﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export const csv = {
  trialBalance: (d: TrialBalance) => [["Code", "Account", "Type", "Debit", "Credit"], ...d.rows.map((r) => [r.code, r.name, r.type, r.debit || "", r.credit || ""]), ["", "Totals", "", d.totals.debit, d.totals.credit]],
  incomeStatement: (d: IncomeStatement) => {
    const head = ["Code", "Account", "General", "Restricted", "Total", `Same period ${d.previousFrom.slice(0, 4)}`, "Budget"]
    const sec = (title: string, s: IncomeStatementSection) => [[title], ...s.rows.map((r) => [r.code, r.name, r.general, r.restricted, r.total, r.previous, r.budget ?? ""]),
      ["", `Total ${title.toLowerCase()}`, s.total.general, s.total.restricted, s.total.total, s.total.previous, s.total.budget ?? ""]]
    return [head, ...sec("Income", d.income), ...sec("Expenses", d.expenses), ["", "Surplus / (deficit)", d.surplus.general, d.surplus.restricted, d.surplus.total, d.surplus.previous, ""]]
  },
  balanceSheet: (d: BalanceSheet) => [
    ["Section", "Code", "Item", "Amount"],
    ...d.assets.fixed.map((a) => ["Fixed assets", a.code, a.name, a.amount]),
    ...d.assets.current.map((a) => ["Current assets", a.code, a.name, a.amount]),
    ["", "", "Total assets", d.assets.total],
    ...d.liabilities.rows.map((a) => ["Liabilities", a.code, a.name, a.amount]),
    ["", "", "Net assets", d.netAssets],
    ...d.funds.rows.map((f) => [f.restricted ? "Restricted funds" : "Funds", "", f.name, f.amount]),
    ["", "", "Total funds", d.funds.total],
  ],
}
