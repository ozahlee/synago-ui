import { Church } from "lucide-react"

/** Split layout for the sign-in and sign-up pages: brand panel + form. */
export function AuthLayout({ children, quote, cite }: { children: React.ReactNode; quote: string; cite: string }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-32 size-[480px] rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/15 ring-1 ring-primary-foreground/20">
            <Church className="size-5" />
          </span>
          <span className="font-display text-xl font-semibold">Synago</span>
        </div>
        <figure className="relative max-w-md">
          <blockquote className="font-display text-3xl leading-snug font-medium text-balance">&ldquo;{quote}&rdquo;</blockquote>
          <figcaption className="mt-4 text-sm tracking-wide text-primary-foreground/70">{cite}</figcaption>
          <div className="mt-6 h-0.5 w-16 rounded-full bg-gold" />
        </figure>
        <p className="relative text-sm text-primary-foreground/60">Members · Giving · Accounts · Calendar · SMS: one place for the whole church office</p>
      </aside>
      <main className="flex items-center justify-center bg-background px-6 py-12">{children}</main>
    </div>
  )
}

export function AuthMark() {
  return (
    <div className="mb-8 flex items-center gap-3 lg:hidden">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Church className="size-5" /></span>
      <span className="font-display text-xl font-semibold">Synago</span>
    </div>
  )
}
