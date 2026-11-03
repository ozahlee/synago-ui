"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Gem, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApi } from "@/lib/api"
import { useAttachmentImage } from "@/components/attachments"
import { useAuth } from "@/lib/auth"
import { longDate } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import type { Marriage, WeddingDetail } from "@/lib/types"

function Certificate() {
  const params = useSearchParams()
  const id = params.get("id")
  const doc = params.get("doc")
  const router = useRouter()
  const { user, loading } = useAuth()
  const settings = useSettings()
  const { data: m, error } = useApi<Marriage>(user && id ? `/marriages/${id}` : null)
  const photo = useAttachmentImage("marriage", user && id && !doc ? id : null)
  const { data: w } = useApi<WeddingDetail>(user && id && doc ? `/marriages/${id}/wedding` : null)
  const [withPhoto, setWithPhoto] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(`/marriages/certificate?id=${id}${doc ? `&doc=${doc}` : ""}`)}`)
  }, [loading, user, router, id, doc])

  if (error) return <p className="p-10 text-destructive">{error.message}</p>
  if (!m || (doc && !w)) return <div className="m-10 h-[600px] animate-pulse rounded-2xl bg-muted" />
  if (doc && w) return <WeddingDoc doc={doc} m={m} w={w} church={settings.churchName} diocese={settings.diocese} />
  const draft = m.status !== "completed"

  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">{draft ? "Not yet solemnised: this is a draft." : "Ready to print."}</p>
        {photo && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={withPhoto} onChange={(e) => setWithPhoto(e.target.checked)} /> Include the wedding photo</label>}
        <Button onClick={() => window.print()}>
          <Printer className="size-4" /> Print
        </Button>
      </div>
      <article className="relative mx-auto max-w-3xl overflow-hidden rounded-sm bg-card p-3 shadow-xl print:max-w-none print:shadow-none">
        <div className="rounded-sm border-[3px] border-double border-gold p-10 text-center sm:p-14">
          {draft && <span className="pointer-events-none absolute inset-0 flex -rotate-12 items-center justify-center text-8xl font-bold tracking-widest text-muted-foreground/10">DRAFT</span>}
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-gold/20 text-gold-foreground">
            <Gem className="size-7" />
          </span>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">{settings.churchName}</p>
          {settings.diocese && <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{settings.diocese}</p>}
          <h1 className="mt-6 text-4xl italic sm:text-5xl" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}>
            Certificate of Holy Matrimony
          </h1>
          <div className="mx-auto mt-4 h-px w-40 bg-gold" />
          {photo && withPhoto && <img src={photo} alt="" className="mx-auto mt-8 h-44 w-auto rounded-sm border-4 border-gold/40 object-cover shadow-md" />}
          <div className="mt-10 space-y-4 text-lg">
            <p className="text-muted-foreground">This is to certify that</p>
            <p className="text-3xl font-semibold tracking-tight">{m.groomName}</p>
            <p className="text-muted-foreground">and</p>
            <p className="text-3xl font-semibold tracking-tight">{m.brideName}</p>
            <p className="text-muted-foreground">
              were joined together in Holy Matrimony on <span className="font-medium text-foreground">{longDate(m.date)}</span>
              {m.place ? <> at <span className="font-medium text-foreground">{m.place}</span></> : null}.
            </p>
            <p className="pt-2 text-base italic text-muted-foreground">&ldquo;What therefore God hath joined together, let not man put asunder.&rdquo;</p>
          </div>
          <footer className="mt-14 grid grid-cols-3 gap-6 text-sm">
            <div><div className="mb-2 border-b border-foreground/40 pb-1 font-medium">{m.officiant ?? " "}</div><p className="text-muted-foreground">Officiating minister</p></div>
            <div><div className="mb-2 border-b border-foreground/40 pb-1 font-medium">{m.witnesses ?? " "}</div><p className="text-muted-foreground">Witnesses</p></div>
            <div><div className="mb-2 border-b border-foreground/40 pb-1">&nbsp;</div><p className="text-muted-foreground">Church stamp</p></div>
          </footer>
          <p className="mt-10 font-mono text-xs text-muted-foreground">Register no. {m.certificateNumber ?? "— (not yet issued)"}</p>
        </div>
      </article>
    </div>
  )
}

const serif = { fontFamily: "Georgia, 'Times New Roman', serif" }

/** Banns notice / certificate of banns, order of service, run sheet. */
function WeddingDoc({ doc, m, w, church, diocese }: { doc: string; m: Marriage; w: WeddingDetail; church: string; diocese: string | null }) {
  const couple = `${m.groomName} & ${m.brideName}`
  const heading = doc === "banns" ? (w.banns.length >= 3 ? "Certificate of Banns" : "Publication of Banns") : doc === "runsheet" ? "Run sheet" : "Order of Service"
  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-2xl justify-end print:hidden">
        <Button onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
      </div>
      <article className="mx-auto max-w-2xl rounded-sm bg-card p-10 shadow-xl print:max-w-none print:shadow-none">
        <header className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{church}</p>
          {diocese && <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{diocese}</p>}
          <h1 className="mt-4 text-3xl italic" style={serif}>{heading}</h1>
          {doc !== "banns" && <p className="mt-3 text-xl font-semibold">{couple}</p>}
          {doc !== "banns" && <p className="text-sm text-muted-foreground">{longDate(m.date)}{w.time ? ` at ${w.time}` : ""}{m.place ? ` · ${m.place}` : ""}</p>}
          <div className="mx-auto mt-4 h-px w-32 bg-gold" />
        </header>

        {doc === "banns" ? (
          <div className="mt-8 space-y-5 text-[15px] leading-relaxed">
            <p style={serif}>
              I publish the Banns of Marriage between <b>{m.groomName}</b> and <b>{m.brideName}</b>. If any of you know cause or just impediment why these two persons
              should not be joined together in Holy Matrimony, ye are to declare it.
            </p>
            <table className="w-full border-collapse text-sm">
              <thead><tr className="border-b text-left"><th className="py-2">Reading</th><th>Sunday</th><th>Service</th><th>Read by</th><th>Signature</th></tr></thead>
              <tbody>
                {[1, 2, 3].map((n) => {
                  const b = w.banns.find((x) => x.number === n)
                  return (
                    <tr key={n} className="border-b [&>td]:py-3 [&>td]:pr-3">
                      <td>{["First", "Second", "Third"][n - 1]}</td>
                      <td>{b ? longDate(b.date) : ""}</td><td>{b?.service ?? ""}</td><td>{b?.readBy ?? ""}</td><td className="w-32" />
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {w.banns.some((b) => b.objection) && (
              <p className="text-sm">Objections: {w.banns.filter((b) => b.objection).map((b) => `${b.objection}${b.objectionResolved ? ` (resolved: ${b.resolution ?? ""})` : " (unresolved)"}`).join("; ")}</p>
            )}
            {w.banns.length >= 3 && !w.banns.some((b) => b.objection && !b.objectionResolved) && (
              <p style={serif}>I certify that the banns of marriage between the above were duly published on the three Sundays stated, and that no lawful impediment was alleged.</p>
            )}
            <footer className="grid grid-cols-2 gap-8 pt-10 text-sm">
              <div><div className="mb-2 border-b border-foreground/40 pb-1">&nbsp;</div><p className="text-muted-foreground">Minister</p></div>
              <div><div className="mb-2 border-b border-foreground/40 pb-1">&nbsp;</div><p className="text-muted-foreground">Church stamp &amp; date</p></div>
            </footer>
          </div>
        ) : (
          <ol className="mt-8 divide-y">
            {w.programme.length === 0 && <p className="text-center text-sm text-muted-foreground">No programme yet. Add it under The day.</p>}
            {w.programme.map((x, i) => (
              <li key={i} className="flex gap-4 py-2.5 text-[15px]">
                <span className="w-14 shrink-0 font-mono text-sm text-muted-foreground">{x.time ?? ""}</span>
                <span className="flex-1" style={doc === "programme" ? serif : undefined}>{x.item}</span>
                {(doc === "runsheet" || x.who) && <span className={doc === "runsheet" ? "w-44 font-medium" : "text-sm italic text-muted-foreground"}>{x.who ?? ""}</span>}
                {doc === "runsheet" && <span className="w-6 shrink-0 rounded border" />}
              </li>
            ))}
          </ol>
        )}
        {doc === "runsheet" && <p className="mt-6 text-xs text-muted-foreground">Officiating: {m.officiant ?? "—"} · Witnesses: {m.witnesses ?? "—"}</p>}
      </article>
    </div>
  )
}

export default function MarriageCertificatePage() {
  return (
    <Suspense>
      <Certificate />
    </Suspense>
  )
}
