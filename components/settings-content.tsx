"use client"

import { useEffect, useState } from "react"
import { mutate } from "swr"
import { ArrowDown, ArrowUp, BellRing, Church, ClipboardCheck, Hash, Plus, X } from "lucide-react"
import { CURRENCY } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldError, str, useApiForm } from "@/components/form"
import { Page, PageHeader } from "@/components/page"
import { put, useApi } from "@/lib/api"
import { ritesFor } from "@/lib/settings"
import type { ChurchSettings, Denomination, RequirementConfig } from "@/lib/types"

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "item"
import { cn } from "@/lib/utils"

const DENOMINATIONS: { value: Denomination; label: string; note: string }[] = [
  { value: "anglican", label: "Anglican", note: "Infant baptism & confirmation, diocese on certificates" },
  { value: "pentecostal", label: "Pentecostal", note: "Water baptism by immersion & child dedication" },
  { value: "other", label: "Other", note: "Baptism, confirmation and dedication all available" },
]

export function SettingsContent() {
  const { data } = useApi<ChurchSettings>("/settings")
  const [denomination, setDenomination] = useState<Denomination>("anglican")
  const [services, setServices] = useState<string[]>([])
  const [newService, setNewService] = useState("")
  const [reqs, setReqs] = useState<RequirementConfig[]>([])
  const [times, setTimes] = useState<Record<string, string>>({})

  useEffect(() => {
    if (data) {
      setDenomination(data.denomination)
      setServices(data.services)
      setTimes(Object.fromEntries(data.services.map((s, i) => [s, data.serviceTimes?.[i] ?? ""])))
      setReqs(data.sacramentRequirements ?? [])
    }
  }, [data])

  const form = useApiForm(async (fd) => {
    const res = await put<{ data: ChurchSettings }>("/settings", {
      churchName: str(fd, "churchName"),
      denomination,
      diocese: str(fd, "diocese"),
      address: str(fd, "address"),
      pledgePrefix: str(fd, "pledgePrefix"),
      services,
      serviceTimes: services.map((s) => times[s] || null),
      quietHoursStart: str(fd, "quietHoursStart"),
      quietHoursEnd: str(fd, "quietHoursEnd"),
      smsMonthlyBudget: Number(str(fd, "smsMonthlyBudget") ?? 0),
      financialYearStartMonth: Number(str(fd, "financialYearStartMonth") ?? 1),
      sacramentRequirements: reqs
        .filter((r) => r.label.trim())
        .map((r) => ({ ...r, key: r.key || slug(r.label), fee: r.fee === null || Number.isNaN(r.fee) ? null : r.fee })),
    })
    mutate("/settings", res, false)
  }, "Settings saved")

  const move = (i: number, d: -1 | 1) =>
    setServices((s) => {
      const next = [...s]
      ;[next[i], next[i + d]] = [next[i + d], next[i]]
      return next
    })

  const addService = () => {
    const v = newService.trim()
    if (v && !services.includes(v)) setServices([...services, v])
    setNewService("")
  }

  if (!data) return <Page><div className="h-96 animate-pulse rounded-2xl bg-muted" /></Page>

  return (
    <Page>
      <PageHeader eyebrow="Administration" title="Church settings" description="Your church's name, tradition and Sunday services. Changes apply for every staff member." />

      <form onSubmit={form.handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Church className="size-5 text-primary" /> Church
            </CardTitle>
            <CardDescription>Printed on certificates and the announcements sheet.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-name">Church name</Label>
              <Input id="c-name" name="churchName" defaultValue={data.churchName} required />
              <FieldError error={form.error} name="churchName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-diocese">{denomination === "anglican" ? "Diocese / archdeaconry" : "Network / region"}</Label>
              <Input id="c-diocese" name="diocese" defaultValue={data.diocese ?? ""} placeholder={denomination === "anglican" ? "e.g. Diocese of Namirembe" : ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="c-address">Address</Label>
              <Input id="c-address" name="address" defaultValue={data.address ?? ""} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Tradition</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {DENOMINATIONS.map((d) => (
                  <button
                    type="button"
                    key={d.value}
                    onClick={() => setDenomination(d.value)}
                    aria-pressed={denomination === d.value}
                    className={cn(
                      "rounded-xl border p-3 text-left transition",
                      denomination === d.value ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-accent",
                    )}
                  >
                    <span className="block font-semibold">{d.label}</span>
                    <span className="block text-xs text-muted-foreground">{d.note}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Registers offered: {ritesFor(denomination).map((r) => r.label).join(", ")}.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sunday services</CardTitle>
            <CardDescription>Offerings are recorded per service and added up into the day&apos;s total. Start times show on the calendar. The order here is the order on reports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="space-y-2">
              {services.map((s, i) => (
                <li key={s} className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">{s}</span>
                  <Input type="time" value={times[s] ?? ""} onChange={(e) => setTimes({ ...times, [s]: e.target.value })} className="h-8 w-28" aria-label={`${s} start time`} />
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${s} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${s} down`} disabled={i === services.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${s}`}
                    disabled={services.length <= 1}
                    onClick={() => setServices(services.filter((x) => x !== s))}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ol>
            <div className="flex gap-2">
              <Input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addService()
                  }
                }}
                placeholder="e.g. Luganda Service, Evening Service"
              />
              <Button type="button" variant="outline" onClick={addService}>
                <Plus className="size-4" /> Add
              </Button>
            </div>
            <FieldError error={form.error} name="services" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="size-5 text-primary" /> Reminders & SMS
            </CardTitle>
            <CardDescription>Automatic SMS reminders never go out during quiet hours (they wait until morning), and stop once the monthly budget is used.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label htmlFor="q-start">Quiet hours from</Label><Input id="q-start" name="quietHoursStart" type="time" defaultValue={data.quietHoursStart ?? "20:00"} /></div>
            <div className="space-y-2"><Label htmlFor="q-end">until</Label><Input id="q-end" name="quietHoursEnd" type="time" defaultValue={data.quietHoursEnd ?? "07:00"} /></div>
            <div className="space-y-2"><Label htmlFor="q-budget">Monthly SMS budget (messages)</Label><Input id="q-budget" name="smsMonthlyBudget" type="number" min={0} defaultValue={data.smsMonthlyBudget ?? 3000} /><p className="text-xs text-muted-foreground">0 = no limit</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-primary" /> Baptism & confirmation requirements
            </CardTitle>
            <CardDescription>
              What each candidate must bring or complete. A candidate can&apos;t be recorded until every item for their rite is ticked (a pastor can override with a reason).
              Items with a fee book the payment to Accounts as “Sacrament fees”.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="hidden grid-cols-[1fr_auto_8rem_2rem] gap-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
              <span>Requirement</span><span>Applies to</span><span>Fee ({CURRENCY})</span><span />
            </div>
            {reqs.map((r, i) => (
              <div key={r.key || i} className="grid gap-2 rounded-xl border p-2 sm:grid-cols-[1fr_auto_8rem_2rem] sm:items-center sm:gap-3 sm:border-0 sm:p-0">
                <Input value={r.label} onChange={(e) => setReqs(reqs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label="Requirement" />
                <div className="flex gap-1">
                  {(["baptism", "confirmation", "dedication"] as const).map((k) => {
                    const on = r.kinds.includes(k)
                    return (
                      <button key={k} type="button" aria-pressed={on}
                        onClick={() => setReqs(reqs.map((x, j) => (j === i ? { ...x, kinds: on ? x.kinds.filter((y) => y !== k) : [...x.kinds, k] } : x)))}
                        className={cn("rounded-full border px-2.5 py-1 text-xs font-medium capitalize", on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground")}>
                        {k}
                      </button>
                    )
                  })}
                </div>
                <Input type="number" min="0" step="0.01" placeholder="No fee" value={r.fee ?? ""} aria-label="Fee"
                  onChange={(e) => setReqs(reqs.map((x, j) => (j === i ? { ...x, fee: e.target.value === "" ? null : Number(e.target.value) } : x)))} />
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${r.label}`} onClick={() => setReqs(reqs.filter((_, j) => j !== i))}><X className="size-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setReqs([...reqs, { key: "", label: "", kinds: ["baptism", "confirmation"], fee: null }])}>
              <Plus className="size-4" /> Add requirement
            </Button>
            <FieldError error={form.error} name="sacramentRequirements" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="size-5 text-primary" /> Pledge numbers
            </CardTitle>
            <CardDescription>
              New members get the next number automatically, e.g. <span className="font-mono">{data.pledgePrefix}-0042</span>. Changing the prefix only
              affects members added from now on.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-w-xs space-y-2">
            <Label htmlFor="c-prefix">Prefix</Label>
            <Input id="c-prefix" name="pledgePrefix" defaultValue={data.pledgePrefix} className="font-mono uppercase" maxLength={10} required />
            <FieldError error={form.error} name="pledgePrefix" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial year</CardTitle>
            <CardDescription>The month the books start each year. Used by the income statement, trial balance and balance sheet.</CardDescription>
          </CardHeader>
          <CardContent className="max-w-xs space-y-2">
            <Label htmlFor="c-fy">Starts in</Label>
            <select id="c-fy" name="financialYearStartMonth" defaultValue={data.financialYearStartMonth ?? 1}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={form.pending}>
            {form.pending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </Page>
  )
}
