"use client"

import Link from "next/link"
import { Wheat, Target, Trophy, Home, Map as MapIcon, Users, Medal } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState, Page, PageHeader, PersonAvatar, StatCard } from "@/components/page"
import { qs, useApi } from "@/lib/api"
import { money, today } from "@/lib/format"
import type { HarvestReport } from "@/lib/types"
import { cn } from "@/lib/utils"
import { usePeriod } from "@/lib/period"
import { PeriodFilter } from "@/components/period-filter"

const LEVEL_LABEL = { archdeaconry: "Archdeaconries", parish: "Parishes", region: "Regions", village: "Villages" } as const

type Row = { id: string; name: string; sub?: string | null; total: number; target: number | null; extra?: string }

function League({ rows, empty }: { rows: Row[]; empty: string }) {
  const top = Math.max(1, ...rows.map((r) => Math.max(r.total, r.target ?? 0)))
  if (!rows.length) return <Card className="py-0"><EmptyState icon={Wheat} title={empty} /></Card>
  return (
    <Card className="gap-0 py-0">
      <ol className="divide-y">
        {rows.map((r, i) => {
          const pct = r.target ? Math.round((r.total / r.target) * 100) : null
          return (
            <li key={r.id} className="flex items-center gap-4 px-5 py-3.5">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular",
                i === 0 ? "bg-gold text-gold-foreground" : i === 1 ? "bg-secondary text-foreground" : i === 2 ? "bg-chart-5/20 text-chart-5" : "text-muted-foreground")}>
                {i < 3 ? <Medal className="size-4" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-semibold">{r.name} {r.sub && <span className="font-normal text-muted-foreground">· {r.sub}</span>}</p>
                  <p className="shrink-0 font-semibold tabular">{money(r.total)}</p>
                </div>
                <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", pct !== null && pct >= 100 ? "bg-gold" : "bg-primary")} style={{ width: `${(r.total / top) * 100}%` }} />
                  {r.target ? <div className="absolute inset-y-0 w-0.5 bg-foreground/50" style={{ left: `${Math.min(100, (r.target / top) * 100)}%` }} title={`Target ${money(r.target)}`} /> : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pct !== null ? `${pct}% of ${money(r.target)} target` : "No target set"}{r.extra ? ` · ${r.extra}` : ""}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

export function HarvestContent() {
  const period = usePeriod("this_year")
  const { data, isLoading } = useApi<HarvestReport>(qs("/reports/harvest", { from: period.range.from ?? undefined, to: period.range.to ?? today() }))
  const levels = (["archdeaconry", "parish", "region", "village"] as const).filter((l) => data?.areas[l]?.length)
  const leadingCell = data?.cells.find((c) => c.total > 0)

  return (
    <Page>
      <PageHeader
        eyebrow="Stewardship"
        title="Harvest"
        description="Every harvest gift counts for its cell group (the gift's own cell, or the giver's) and adds up through village, region, parish and archdeaconry."
        actions={
          <>
            <Button variant="outline" asChild><Link href="/cell-groups">Set cell targets</Link></Button>
          </>
        }
      />

      <PeriodFilter period={period} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Harvest received" icon={Wheat} tone="gold" value={data && money(data.total)} />
        <StatCard label="Target" icon={Target} value={data && (data.target ? money(data.target) : "—")}
          hint={data?.target ? `${Math.round((data.total / data.target) * 100)}% reached` : "Set targets on cell groups"} />
        <StatCard label="Leading cell" icon={Trophy} tone="success" value={data && (leadingCell?.name ?? "—")} hint={leadingCell && money(leadingCell.total)} valueClassName="text-xl md:text-2xl" />
        <StatCard label="Not linked to a cell" icon={Users} tone="neutral" value={data && money(data.unassigned.total)} hint={data && `${data.unassigned.gifts} gifts (visitors / no cell)`} />
      </section>

      {isLoading ? <div className="h-80 animate-pulse rounded-2xl bg-muted" /> : data && (
        <Tabs defaultValue="cells" className="gap-4">
          <TabsList className="max-w-full overflow-x-auto">
            <TabsTrigger value="cells"><Home className="size-4" /> Cells</TabsTrigger>
            {levels.map((l) => <TabsTrigger key={l} value={l}><MapIcon className="size-4" /> {LEVEL_LABEL[l]}</TabsTrigger>)}
            <TabsTrigger value="givers"><Users className="size-4" /> Top givers</TabsTrigger>
          </TabsList>
          <TabsContent value="cells">
            <League empty="No cell groups yet" rows={data.cells.map((c) => ({ id: c.id, name: c.name, sub: c.area, total: c.total, target: c.target, extra: `${c.givers} givers, ${c.gifts} gifts` }))} />
          </TabsContent>
          {levels.map((l) => (
            <TabsContent key={l} value={l}>
              <League empty="Nothing here" rows={(data.areas[l] ?? []).map((a) => ({ id: a.id, name: a.name, sub: a.parent, total: a.total, target: a.target, extra: `${a.cells} cell${a.cells === 1 ? "" : "s"}` }))} />
            </TabsContent>
          ))}
          <TabsContent value="givers">
            {data.topGivers.length === 0 ? <Card className="py-0"><EmptyState icon={Users} title="No member harvest gifts yet" /></Card> : (
              <Card className="gap-0 py-0">
                <ol className="divide-y">
                  {data.topGivers.map((g, i) => (
                    <li key={g.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="w-6 text-center text-sm font-semibold text-muted-foreground tabular">{i + 1}</span>
                      <PersonAvatar name={g.name} />
                      <div className="min-w-0 flex-1"><p className="font-semibold">{g.name}</p><p className="text-xs text-muted-foreground">{[g.pledgeNumber, g.cell].filter(Boolean).join(" · ")}</p></div>
                      <span className="font-semibold tabular">{money(g.total)}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </Page>
  )
}
