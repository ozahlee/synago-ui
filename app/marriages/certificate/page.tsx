"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Gem, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { longDate } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import type { Marriage } from "@/lib/types"

function Certificate() {
  const id = useSearchParams().get("id")
  const router = useRouter()
  const { user, loading } = useAuth()
  const settings = useSettings()
  const { data: m, error } = useApi<Marriage>(user && id ? `/marriages/${id}` : null)

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(`/marriages/certificate?id=${id}`)}`)
  }, [loading, user, router, id])

  if (error) return <p className="p-10 text-destructive">{error.message}</p>
  if (!m) return <div className="m-10 h-[600px] animate-pulse rounded-2xl bg-muted" />
  const draft = m.status !== "completed"

  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">{draft ? "Not yet solemnised: this is a draft." : "Ready to print."}</p>
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

export default function MarriageCertificatePage() {
  return (
    <Suspense>
      <Certificate />
    </Suspense>
  )
}
