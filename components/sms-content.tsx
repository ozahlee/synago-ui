"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { mutate } from "swr"
import { MessageSquareText, Send, Users, Info, CheckCircle2, XCircle, Cake, HeartCrack, Church, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState, Page, PageHeader, TableCard, TableSkeleton } from "@/components/page"
import { Pager } from "@/components/pager"
import { runAction } from "@/components/form"
import { post, qs, useApi, usePaginated } from "@/lib/api"
import { useSettings } from "@/lib/settings"
import type { CellGroupIndex, Ministry, SmsAudience, SmsBatch, SmsPreview } from "@/lib/types"
import { cn } from "@/lib/utils"
import { usePeriod } from "@/lib/period"
import { PeriodFilter, periodParams } from "@/components/period-filter"

type AudienceType = SmsAudience["type"]
const AUDIENCES: { value: AudienceType; label: string }[] = [
  { value: "all", label: "All active members" },
  { value: "ministry", label: "A ministry" },
  { value: "cell_group", label: "A cell group" },
  { value: "gender", label: "Men or women" },
  { value: "birthdays", label: "Birthdays today" },
  { value: "visitors", label: "Recent visitors" },
  { value: "numbers", label: "Type phone numbers" },
]

const TEMPLATES = [
  { icon: Church, label: "Service reminder", text: "Dear {name}, you are warmly invited to Sunday service at {church}. God bless you!" },
  { icon: Cake, label: "Birthday", text: "Happy birthday {name}! The {church} family celebrates you today. May the Lord bless you and keep you. Numbers 6:24" },
  { icon: HeartCrack, label: "Condolence", text: "Dear {name}, the {church} family stands with you in this time of loss. We are praying for you. Psalm 34:18" },
  { icon: Users, label: "Visitor welcome", text: "Hello {name}, thank you for worshipping with us at {church}. We would love to see you again this Sunday!" },
]

/** GSM-7 messages split at 160/153 chars; anything else (e.g. emoji) at 70/67. */
function segments(text: string) {
  const gsm = /^[\x20-\x7E\n\r£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ¡ÄÖÑÜ§¿äöñüà€]*$/.test(text)
  const [one, many] = gsm ? [160, 153] : [70, 67]
  const n = text.length <= one ? 1 : Math.ceil(text.length / many)
  return { n, limit: n === 1 ? one : n * many, gsm }
}

export function SmsContent() {
  return (
    <Suspense>
      <Sms />
    </Suspense>
  )
}

function Sms() {
  const params = useSearchParams()
  const { churchName } = useSettings()
  const [type, setType] = useState<AudienceType>((params.get("audience") as AudienceType) ?? "all")
  const [ministryId, setMinistryId] = useState("")
  const [cellGroupId, setCellGroupId] = useState("")
  const [gender, setGender] = useState<"male" | "female">("female")
  const [numbers, setNumbers] = useState("")
  const [message, setMessage] = useState(params.get("message") ?? "")
  const [preview, setPreview] = useState<SmsPreview | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const [page, setPage] = useState(1)
  const period = usePeriod("all")
  useEffect(() => setPage(1), [period.range.from, period.range.to])
  const [viewing, setViewing] = useState<string | null>(null)

  const { data: ministries = [] } = useApi<Ministry[]>(type === "ministry" ? "/ministries" : null)
  const { data: cells } = useApi<CellGroupIndex>(type === "cell_group" ? "/cell-groups" : null)
  const { rows: history, meta, isLoading } = usePaginated<SmsBatch>(qs("/sms", { ...periodParams(period), page, perPage: 10 }))
  const [driver, setDriver] = useState<string | null>(null)

  const audience = useMemo<SmsAudience | null>(() => {
    if (type === "ministry") return ministryId ? { type, ministryId: Number(ministryId) } : null
    if (type === "cell_group") return cellGroupId ? { type, cellGroupId: Number(cellGroupId) } : null
    if (type === "gender") return { type, gender }
    if (type === "numbers") return numbers.trim() ? { type, numbers } : null
    if (type === "members") return null
    return { type }
  }, [type, ministryId, cellGroupId, gender, numbers])

  useEffect(() => {
    if (!audience) return setPreview(null)
    const t = setTimeout(async () => {
      try {
        const r = await post<{ data: SmsPreview }>("/sms/preview", { audience, message })
        setPreview(r.data)
        setDriver(r.data.driver)
      } catch {
        setPreview(null)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [audience, message])

  const seg = segments(message.replaceAll("{church}", churchName).replaceAll("{name}", "Margaret"))
  const canSend = !!audience && !!message.trim() && !!preview?.recipients

  const send = async () => {
    if (!audience) return
    setSending(true)
    const ok = await runAction(() => post("/sms", { audience, message }), driver === "log" ? "Saved to the log (test mode). Nothing was sent." : "Messages sent")
    setSending(false)
    setConfirm(false)
    if (ok) {
      setMessage("")
      mutate((k) => typeof k === "string" && k.startsWith("/sms"))
    }
  }

  return (
    <Page>
      <PageHeader eyebrow="Office" title="Bulk SMS" description="Text the congregation, a ministry, a cell group, today's birthdays or recent visitors." />

      {driver === "log" && (
        <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            <span className="font-semibold">Test mode.</span> Messages are written to the server log, not sent. To send for real, set{" "}
            <code className="rounded bg-card px-1">SMS_DRIVER=africastalking</code>, <code className="rounded bg-card px-1">AT_USERNAME</code> and{" "}
            <code className="rounded bg-card px-1">AT_API_KEY</code> (and optionally <code className="rounded bg-card px-1">AT_SENDER_ID</code>) in the backend&apos;s .env.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Compose</CardTitle>
            <CardDescription>
              Use <code className="rounded bg-secondary px-1">{"{name}"}</code> for each person&apos;s first name and{" "}
              <code className="rounded bg-secondary px-1">{"{church}"}</code> for {churchName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sms-aud">Send to</Label>
                <Select value={type} onValueChange={(v) => setType(v as AudienceType)}>
                  <SelectTrigger id="sms-aud" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{AUDIENCES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {type === "ministry" && (
                <div className="space-y-2">
                  <Label htmlFor="sms-min">Ministry</Label>
                  <Select value={ministryId} onValueChange={setMinistryId}>
                    <SelectTrigger id="sms-min" className="w-full"><SelectValue placeholder="Choose…" /></SelectTrigger>
                    <SelectContent>{ministries.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {type === "cell_group" && (
                <div className="space-y-2">
                  <Label htmlFor="sms-cell">Cell group</Label>
                  <Select value={cellGroupId} onValueChange={setCellGroupId}>
                    <SelectTrigger id="sms-cell" className="w-full"><SelectValue placeholder="Choose…" /></SelectTrigger>
                    <SelectContent>{cells?.groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {type === "gender" && (
                <div className="space-y-2">
                  <Label htmlFor="sms-g">Who</Label>
                  <Select value={gender} onValueChange={(v) => setGender(v as typeof gender)}>
                    <SelectTrigger id="sms-g" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="female">Women</SelectItem><SelectItem value="male">Men</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {type === "numbers" && (
              <div className="space-y-2">
                <Label htmlFor="sms-nums">Phone numbers</Label>
                <Textarea id="sms-nums" rows={2} value={numbers} onChange={(e) => setNumbers(e.target.value)} placeholder="0772 123456, 0701 987654…" />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <Label htmlFor="sms-msg">Message</Label>
                <span className={cn("text-xs tabular", seg.n > 2 ? "text-warning" : "text-muted-foreground")}>
                  ~{message.length} chars · {seg.n} SMS{seg.n > 1 ? " each" : ""}{!seg.gsm && " (special characters)"}
                </span>
              </div>
              <Textarea id="sms-msg" rows={5} value={message} maxLength={900} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message…" />
              <div className="flex flex-wrap gap-2 pt-1">
                {TEMPLATES.map((t) => (
                  <button key={t.label} type="button" onClick={() => setMessage(t.text)} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium hover:bg-accent">
                    <t.icon className="size-3.5 text-primary" /> {t.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>{preview ? preview.label : "Choose who to send to"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold tabular">{preview?.recipients ?? "—"}</span>
              <span className="text-sm text-muted-foreground">people will get it</span>
            </div>
            {!!preview?.withoutPhone && <p className="text-xs text-muted-foreground">{preview.withoutPhone} skipped: no usable phone number.</p>}
            {!!preview?.sample.length && <p className="text-xs text-muted-foreground">Including {preview.sample.join(", ")}{preview.recipients > preview.sample.length ? "…" : ""}</p>}
            <div className="rounded-2xl rounded-bl-sm bg-primary/10 p-3 text-sm leading-relaxed">
              {preview?.example ?? message ?? ""}
              {!message && <span className="text-muted-foreground">Your message appears here as the first person will see it.</span>}
            </div>
            {preview && message && (
              <p className="text-xs text-muted-foreground tabular">About {preview.recipients * seg.n} SMS credits in total.</p>
            )}
            <Button className="w-full" size="lg" disabled={!canSend} onClick={() => setConfirm(true)}>
              <Send className="size-4" /> Send to {preview?.recipients ?? 0}
            </Button>
          </CardContent>
        </Card>
      </div>

      <PeriodFilter period={period} allowAll label="Sent" />

      <TableCard title="Sent messages" count={meta?.total} footer={meta && meta.total > 0 && <Pager meta={meta} onPage={setPage} />}>
        {isLoading && !meta ? <TableSkeleton rows={3} /> : history.length === 0 ? (
          <EmptyState icon={MessageSquareText} title="Nothing sent yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Message</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="hidden md:table-cell">When</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="max-w-md whitespace-normal"><p className="line-clamp-2 text-sm">{b.message}</p></TableCell>
                  <TableCell className="text-sm">{b.audienceLabel}<p className="text-xs text-muted-foreground">{b.recipients} people</p></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {b.driver === "log" ? <Badge variant="muted">Test mode</Badge> : <Badge variant="success">{b.sent} sent</Badge>}
                      {b.failed > 0 && <Badge variant="danger">{b.failed} failed</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {new Date(b.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    {b.sentBy && <p className="text-xs">{b.sentBy}</p>}
                  </TableCell>
                  <TableCell><Button variant="ghost" size="icon-sm" aria-label="Details" onClick={() => setViewing(b.id)}><Eye className="size-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send to {preview?.recipients} people?</DialogTitle>
            <DialogDescription>{preview?.label}. Messages can&apos;t be recalled once sent.</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-secondary/60 p-3 text-sm">{preview?.example ?? message}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button onClick={send} disabled={sending}><Send className="size-4" /> {sending ? "Sending…" : "Send now"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewing && <BatchDialog id={viewing} onClose={() => setViewing(null)} />}
    </Page>
  )
}

function BatchDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useApi<SmsBatch>(`/sms/${id}`)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{data?.audienceLabel ?? "Message"}</DialogTitle>
          <DialogDescription>{data && `${data.sent} delivered to the network · ${data.failed} failed${data.driver === "log" ? " · test mode" : ""}`}</DialogDescription>
        </DialogHeader>
        {data && <div className="rounded-xl bg-secondary/60 p-3 text-sm">{data.message}</div>}
        <ul className="divide-y rounded-xl border">
          {data?.messages?.map((m) => (
            <li key={m.phone} className="flex items-center gap-3 px-3 py-2 text-sm">
              {m.status === "sent" ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-destructive" />}
              <span className="flex-1">{m.name ?? "—"}</span>
              <span className="font-mono text-xs text-muted-foreground">{m.phone}</span>
              {m.error && <span className="text-xs text-destructive">{m.error}</span>}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
