"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, HandCoins, Coins, HandHeart, Gift, Wheat } from "lucide-react"
import { Page, PageHeader, StatCard, type Tone } from "@/components/page"

const CATEGORY_ICONS = [Coins, HandHeart, Gift, Wheat]
const CATEGORY_TONES: Tone[] = ["primary", "gold", "info", "success"]
import { OffertoryTable } from "@/components/offertory-table"
import { OffertoryFormDialog } from "@/components/offertory-form-dialog"
import { OffertoryCategoryChart } from "@/components/offertory-category-chart"
import { SundayBreakdown } from "@/components/sunday-breakdown"
import { qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { money, pctChange, titleCase } from "@/lib/format"
import { usePeriod } from "@/lib/period"
import { PeriodFilter, periodParams } from "@/components/period-filter"
import { OFFERTORY_CATEGORIES, type OffertorySummary } from "@/lib/types"

export function OffertoryContent() {
  const { can } = useAuth()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const period = usePeriod("this_month")
  const { data: current } = useApi<OffertorySummary>(qs("/offertory/summary", periodParams(period)))
  const { data: previous } = useApi<OffertorySummary>(period.previous ? qs("/offertory/summary", period.previous) : null)
  const vs = period.previous ? "vs previous period" : undefined

  const total = current?.total
  const change = pctChange(previous?.total ?? 0, current?.total ?? 0)

  return (
    <Page>
      <PageHeader
        eyebrow="Stewardship"
        title="Offertory"
        description="Tithes, pledges, thanksgiving and harvest offerings, recorded and tracked."
        actions={
          can("finance.manage") && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="size-4" />
              Record offering
            </Button>
          )
        }
      />

      <PeriodFilter period={period} allowAll />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label={`Total · ${period.label.toLowerCase()}`}
          icon={HandCoins}
          tone="primary"
          value={total === undefined ? undefined : money(total)}
          trend={change === null ? null : parseFloat(change)}
          hint={change === null ? undefined : vs}
          valueClassName="text-primary text-xl md:text-[1.35rem]"
        />
        {OFFERTORY_CATEGORIES.map((cat, i) => {
          const curr = current?.byCategory[cat].total ?? 0
          const ch = pctChange(previous?.byCategory[cat].total ?? 0, curr)
          return (
            <StatCard
              key={cat}
              label={titleCase(cat)}
              icon={CATEGORY_ICONS[i]}
              tone={CATEGORY_TONES[i]}
              value={current ? money(curr) : undefined}
              trend={ch === null ? null : parseFloat(ch)}
              hint={ch === null || !vs ? `${current?.byCategory[cat].count ?? 0} gifts` : vs}
              valueClassName="text-xl md:text-[1.35rem]"
            />
          )
        })}
      </section>

      <SundayBreakdown />

      <OffertoryCategoryChart summary={current} periodLabel={period.label} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="tithe">Tithe</TabsTrigger>
          <TabsTrigger value="pledge">Pledge</TabsTrigger>
          <TabsTrigger value="thanksgiving">Thanksgiving</TabsTrigger>
          <TabsTrigger value="harvest">Harvest</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          <OffertoryTable category={activeTab} from={period.range.from} to={period.range.to} />
        </TabsContent>
      </Tabs>

      <OffertoryFormDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </Page>
  )
}
