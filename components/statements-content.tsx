"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { FileText, Printer, Search, Users, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, Page, PageHeader, PersonAvatar, StatCard, TableCard, TableSkeleton } from "@/components/page"
import { qs, useApi } from "@/lib/api"
import { money, today } from "@/lib/format"
import type { GivingStatement } from "@/lib/types"
import { rangeLabel, usePeriod } from "@/lib/period"
import { PeriodFilter } from "@/components/period-filter"

export function StatementsContent() {
  const period = usePeriod("this_year")
  const range = { from: period.range.from ?? "", to: period.range.to ?? today() }
  const rq = `from=${range.from}&to=${range.to}`
  const when = period.preset === "custom" ? rangeLabel(range) : period.label.toLowerCase()
  const [search, setSearch] = useState("")
  const { data = [], isLoading } = useApi<GivingStatement[]>(qs("/reports/statements", range))

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((s) => !q || s.member.name.toLowerCase().includes(q) || (s.member.pledgeNumber ?? "").toLowerCase().includes(q))
  }, [data, search])
  const total = data.reduce((s, x) => s + x.grandTotal, 0)

  return (
    <Page>
      <PageHeader
        eyebrow="Stewardship · Reports"
        title="Giving statements"
        description="A thank-you letter for each member listing what they gave in the period (usually the year). Print one, or all of them at once."
        actions={
          <>
            <Button asChild disabled={!data.length}>
              <Link href={`/statements/print?${rq}`} target="_blank"><Printer className="size-4" /> Print all ({data.length})</Link>
            </Button>
          </>
        }
      />

      <PeriodFilter period={period} />

      <section className="grid gap-4 sm:grid-cols-2">
        <StatCard label={`Members who gave · ${when}`} icon={Users} value={isLoading ? undefined : data.length.toLocaleString()} />
        <StatCard label="Given by members" icon={Coins} tone="gold" value={isLoading ? undefined : money(total)} hint="Offertory and project contributions" />
      </section>

      <TableCard
        title="Members"
        count={rows.length}
        actions={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or pledge no…" className="h-9 pl-9" />
          </div>
        }
      >
        {isLoading ? <TableSkeleton /> : rows.length === 0 ? (
          <EmptyState icon={FileText} title="No member giving recorded in this period" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="hidden text-right md:table-cell">Tithe</TableHead>
                <TableHead className="hidden text-right lg:table-cell">Other offerings</TableHead>
                <TableHead className="hidden text-right lg:table-cell">Donations</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <PersonAvatar name={s.member.name} />
                      <div>
                        <p className="font-semibold">{s.member.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{s.member.pledgeNumber}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-right tabular md:table-cell">{money(s.byCategory.tithe)}</TableCell>
                  <TableCell className="hidden text-right tabular lg:table-cell">{money(s.offertoryTotal - s.byCategory.tithe)}</TableCell>
                  <TableCell className="hidden text-right tabular lg:table-cell">{money(s.donationTotal)}</TableCell>
                  <TableCell className="text-right font-semibold tabular">{money(s.grandTotal)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/statements/print?${rq}&memberId=${s.member.id}`} target="_blank"><Printer className="size-4" /> Print</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>
    </Page>
  )
}
