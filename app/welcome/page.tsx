"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { mutate } from "swr"
import { Church, CalendarClock, Hash, Rocket, Plus, Trash2, Check, Users, UserPlus, Scale, HandCoins, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ApiError, post, put, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { ChurchSettings } from "@/lib/types"
import { cn } from "@/lib/utils"

const STEPS = [
  { key: "church", title: "Your church", icon: Church },
  { key: "services", title: "Services", icon: CalendarClock },
  { key: "numbers", title: "Numbers & money", icon: Hash },
  { key: "done", title: "Ready", icon: Rocket },
] as const
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

/** First-run set-up for a newly registered church. Every step saves as you go; it can be skipped. */
export default function WelcomePage() {
  const { user, loading, refresh, can } = useAuth()
  const router = useRouter()
  const { data: settings } = useApi<ChurchSettings>(user?.church ? "/settings" : null, { revalidateOnFocus: false })
  const [step, setStep] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // form state, filled from the church's settings once loaded
  const [church, setChurch] = useState({ churchName: "", denomination: "anglican", diocese: "", address: "" })
  const [services, setServices] = useState<Array<{ name: string; time: string }>>([])
  const [prefix, setPrefix] = useState("")
  const [fyMonth, setFyMonth] = useState("1")

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/welcome")
    if (user && (user.platformAdmin || !can("settings.manage"))) router.replace("/")
  }, [loading, user, router, can])
  useEffect(() => {
    if (!settings) return
    setChurch({ churchName: settings.churchName, denomination: settings.denomination, diocese: settings.diocese ?? "", address: settings.address ?? "" })
    setServices(settings.services.map((name, i) => ({ name, time: settings.serviceTimes?.[i] ?? "" })))
    setPrefix(settings.pledgePrefix)
    setFyMonth(String(settings.financialYearStartMonth ?? 1))
  }, [settings])

  const save = async (body: Record<string, unknown>) => {
    setPending(true)
    setError(null)
    try {
      const res = await put<{ data: ChurchSettings }>("/settings", body)
      mutate("/settings", res, false)
      setStep((s) => s + 1)
    } catch (e) {
      setError(e instanceof ApiError ? Object.values(e.errors)[0]?.[0] ?? e.message : "Could not save. Check your connection.")
    } finally {
      setPending(false)
    }
  }
  const finish = async (to: string) => {
    setPending(true)
    try {
      await post("/church/onboarding")
      await refresh()
      router.replace(to)
    } finally {
      setPending(false)
    }
  }

  if (!user?.church || !settings) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Opening your church…</div>

  const current = STEPS[step]
  return (
    <div className="min-h-screen bg-secondary/40 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-foreground">Welcome to Synago</p>
            <h1 className="mt-1 text-2xl font-semibold">Let&apos;s set up {user.church.name}</h1>
            <p className="text-sm text-muted-foreground">A few minutes now; you can change everything later in Church settings.</p>
          </div>
          {step < 3 && <Button variant="ghost" onClick={() => finish("/")} disabled={pending}>Skip for now</Button>}
        </div>

        <ol className="mb-6 grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.key} className="space-y-1.5">
              <div className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
              <p className={cn("flex items-center gap-1.5 text-xs font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>
                {i < step ? <Check className="size-3.5 text-success" /> : <s.icon className="size-3.5" />}<span className="hidden sm:inline">{s.title}</span>
              </p>
            </li>
          ))}
        </ol>

        <Card className="gap-0 p-6 sm:p-8">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold"><current.icon className="size-5 text-primary" />{current.title}</h2>

          {step === 0 && (
            <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => (e.preventDefault(), save({ ...church, diocese: church.diocese || null, address: church.address || null }))}>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="w-name">Church name</Label><Input id="w-name" value={church.churchName} onChange={(e) => { const v = e.target.value; setChurch((c) => ({ ...c, churchName: v })) }} required /></div>
              <div className="space-y-2">
                <Label htmlFor="w-den">Tradition</Label>
                <Select value={church.denomination} onValueChange={(v) => v && setChurch((c) => ({ ...c, denomination: v }))}>
                  <SelectTrigger id="w-den" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="anglican">Anglican</SelectItem><SelectItem value="pentecostal">Pentecostal</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="w-dio">{church.denomination === "anglican" ? "Diocese / archdeaconry" : "Region / network"}</Label><Input id="w-dio" value={church.diocese} onChange={(e) => { const v = e.target.value; setChurch((c) => ({ ...c, diocese: v })) }} /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="w-addr">Address / location</Label><Input id="w-addr" value={church.address} onChange={(e) => { const v = e.target.value; setChurch((c) => ({ ...c, address: v })) }} placeholder="e.g. Plot 12, Ntinda, Kampala" /></div>
              <Footer pending={pending} error={error} />
            </form>
          )}

          {step === 1 && (
            <form className="mt-4 space-y-3" onSubmit={(e) => (e.preventDefault(), save({ services: services.map((s) => s.name.trim()).filter(Boolean), serviceTimes: services.filter((s) => s.name.trim()).map((s) => s.time || null) }))}>
              <p className="text-sm text-muted-foreground">Offertory and attendance are recorded per service, and the calendar shows them every Sunday.</p>
              {services.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input aria-label="Service name" value={s.name} onChange={(e) => setServices(services.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} placeholder="e.g. English Service" />
                  <Input aria-label="Start time" type="time" className="w-32" value={s.time} onChange={(e) => setServices(services.map((x, k) => (k === i ? { ...x, time: e.target.value } : x)))} />
                  <Button type="button" variant="ghost" size="icon" disabled={services.length <= 1} onClick={() => setServices(services.filter((_, k) => k !== i))} aria-label="Remove service"><Trash2 className="size-4" /></Button>
                </div>
              ))}
              {services.length < 10 && <Button type="button" variant="outline" size="sm" onClick={() => setServices([...services, { name: "", time: "" }])}><Plus className="size-4" /> Add a service</Button>}
              <Footer pending={pending} error={error} onBack={() => setStep(0)} />
            </form>
          )}

          {step === 2 && (
            <form className="mt-4 grid gap-5 sm:grid-cols-2" onSubmit={(e) => (e.preventDefault(), save({ pledgePrefix: prefix.trim().toUpperCase(), financialYearStartMonth: Number(fyMonth) }))}>
              <div className="space-y-2">
                <Label htmlFor="w-prefix">Pledge / envelope number prefix</Label>
                <Input id="w-prefix" value={prefix} maxLength={10} onChange={(e) => setPrefix(e.target.value.replace(/[^A-Za-z0-9-]/g, ""))} className="font-mono uppercase" required />
                <p className="text-xs text-muted-foreground">Members get <span className="font-mono">{(prefix || "CH").toUpperCase()}-0001</span>, <span className="font-mono">-0002</span>… automatically.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="w-fy">Financial year starts</Label>
                <Select value={fyMonth} onValueChange={(v) => v && setFyMonth(v)}>
                  <SelectTrigger id="w-fy" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Used by the income statement, balance sheet and &ldquo;this year&rdquo; filters.</p>
              </div>
              <Footer pending={pending} error={error} onBack={() => setStep(1)} />
            </form>
          )}

          {step === 3 && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">Your church is ready. Here&apos;s a good order to start in:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { href: "/members", icon: Users, title: "Add your members", note: "One by one, or by family and cell" },
                  { href: "/staff", icon: UserPlus, title: "Invite your staff", note: "Treasurer, secretary, pastor, leaders" },
                  { href: "/accounts?tab=journals", icon: Scale, title: "Enter opening balances", note: "Cash, bank, mobile money, land" },
                  { href: "/offertory", icon: HandCoins, title: "Record Sunday's offertory", note: "By service, with pledge numbers" },
                ].map((a) => (
                  <button key={a.href} type="button" disabled={pending} onClick={() => finish(a.href)}
                    className="group flex items-start gap-3 rounded-xl border p-4 text-left transition hover:border-primary/40 hover:bg-primary/5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><a.icon className="size-5" /></span>
                    <span className="min-w-0 flex-1"><span className="block font-semibold">{a.title}</span><span className="block text-xs text-muted-foreground">{a.note}</span></span>
                    <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                ))}
              </div>
              {user.church.trialDaysLeft !== null && <p className="text-sm text-muted-foreground">Your free trial runs for {user.church.trialDaysLeft} days.</p>}
              <div className="flex justify-end"><Button size="lg" onClick={() => finish("/")} disabled={pending}>Go to the dashboard</Button></div>
            </div>
          )}
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground"><Link href="/" className="hover:underline">Synago</Link> · church office software</p>
      </div>
    </div>
  )
}

function Footer({ pending, error, onBack }: { pending: boolean; error: string | null; onBack?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 sm:col-span-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : <span />}
      <div className="flex gap-2">
        {onBack && <Button type="button" variant="outline" onClick={onBack}>Back</Button>}
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Continue"}</Button>
      </div>
    </div>
  )
}
