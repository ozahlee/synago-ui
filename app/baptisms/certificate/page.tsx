"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Church, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { longDate } from "@/lib/format"
import { rite, useSettings } from "@/lib/settings"
import type { Baptism } from "@/lib/types"

function Certificate() {
  const id = useSearchParams().get("id")
  const router = useRouter()
  const { user, loading } = useAuth()
  const settings = useSettings()
  const { data: b, error } = useApi<Baptism>(user && id ? `/baptisms/${id}` : null)

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(`/baptisms/certificate?id=${id}`)}`)
  }, [loading, user, router, id])

  if (error) return <p className="p-10 text-destructive">{error.message}</p>
  if (!b) return <div className="m-10 h-[600px] animate-pulse rounded-2xl bg-muted" />

  const r = rite(b.kind, settings.denomination)
  const parents = [b.fatherName, b.motherName].filter(Boolean).join(" and ")
  const pending = b.status !== "completed"
  const verb = { baptism: "received Holy Baptism", confirmation: "was confirmed", dedication: "was dedicated to the Lord" }[b.kind]

  return (
    <div className="min-h-screen bg-secondary/50 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">
          {pending ? "This person hasn't been marked completed yet — the certificate is a draft." : "Ready to print (A4, landscape works best)."}
        </p>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" /> Print
        </Button>
      </div>

      <article className="relative mx-auto max-w-3xl overflow-hidden rounded-sm bg-card p-3 shadow-xl print:max-w-none print:shadow-none">
        <div className="rounded-sm border-[3px] border-double border-gold p-10 sm:p-14">
          {pending && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-8xl font-bold tracking-widest text-muted-foreground/10 -rotate-12">
              DRAFT
            </span>
          )}
          <header className="text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Church className="size-7" />
            </span>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">{settings.churchName}</p>
            {settings.diocese && <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{settings.diocese}</p>}
            <h1 className="mt-6 font-serif text-4xl font-normal italic text-foreground sm:text-5xl" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              {r.certificate}
            </h1>
            <div className="mx-auto mt-4 h-px w-40 bg-gold" />
          </header>

          <div className="mt-10 space-y-5 text-center text-lg leading-relaxed">
            <p className="text-muted-foreground">This is to certify that</p>
            <p className="text-3xl font-semibold tracking-tight">{b.name}</p>
            {(parents || b.dateOfBirth) && (
              <p className="text-muted-foreground">
                {parents && (
                  <>
                    {b.gender === "female" ? "daughter" : b.gender === "male" ? "son" : "child"} of{" "}
                    <span className="font-medium text-foreground">{parents}</span>
                  </>
                )}
                {parents && b.dateOfBirth ? ", " : ""}
                {b.dateOfBirth && (
                  <>
                    born on <span className="font-medium text-foreground">{longDate(b.dateOfBirth)}</span>
                  </>
                )}
              </p>
            )}
            <p className="text-muted-foreground">
              {verb}
              {b.kind === "baptism" && b.mode ? ` by ${b.mode}` : ""} on{" "}
              <span className="font-medium text-foreground">{longDate(b.date)}</span>
              {b.place ? (
                <>
                  {" "}at <span className="font-medium text-foreground">{b.place}</span>
                </>
              ) : null}
              .
            </p>
            {b.sponsors && (
              <p className="text-base text-muted-foreground">
                {b.kind === "confirmation" ? "Sponsors" : "Godparents"}: <span className="text-foreground">{b.sponsors}</span>
              </p>
            )}
          </div>

          <footer className="mt-16 grid grid-cols-2 gap-10 text-sm">
            <div className="text-center">
              <div className="mb-2 border-b border-foreground/40 pb-1 font-medium">{b.officiant ?? " "}</div>
              <p className="text-muted-foreground">Officiating minister</p>
            </div>
            <div className="text-center">
              <div className="mb-2 border-b border-foreground/40 pb-1">&nbsp;</div>
              <p className="text-muted-foreground">Parish priest / Church stamp</p>
            </div>
          </footer>
          <p className="mt-10 text-center font-mono text-xs text-muted-foreground">
            Register no. {b.certificateNumber ?? "— (not yet issued)"}
          </p>
        </div>
      </article>
    </div>
  )
}

export default function CertificatePage() {
  return (
    <Suspense>
      <Certificate />
    </Suspense>
  )
}
