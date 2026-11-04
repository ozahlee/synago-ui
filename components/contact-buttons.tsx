"use client"

import { toast } from "sonner"
import { Copy, Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import { mailHref, mapsHref, telHref, waHref } from "@/lib/contact"
import { cn } from "@/lib/utils"

type Contact = { phone?: string | null; email?: string | null; address?: string | null }

const stop = (e: React.SyntheticEvent) => e.stopPropagation()

/** Small round buttons: call, WhatsApp, email. Safe inside clickable cards (they don't open the card). */
export function ContactIcons({ phone, email, className, size = "sm" }: Contact & { className?: string; size?: "sm" | "xs" }) {
  if (!phone && !email) return null
  const btn = cn("inline-flex items-center justify-center rounded-full border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-primary", size === "xs" ? "size-6" : "size-7")
  const icon = size === "xs" ? "size-3" : "size-3.5"
  return (
    <span className={cn("inline-flex items-center gap-1", className)} onClick={stop} onKeyDown={stop}>
      {phone && <a href={telHref(phone)} className={btn} aria-label={`Call ${phone}`} title={`Call ${phone}`}><Phone className={icon} /></a>}
      {phone && <a href={waHref(phone)} target="_blank" rel="noreferrer" className={btn} aria-label="WhatsApp" title="WhatsApp"><MessageCircle className={icon} /></a>}
      {email && <a href={mailHref(email)} className={btn} aria-label={`Email ${email}`} title={email}><Mail className={icon} /></a>}
    </span>
  )
}

/** The details themselves, each a link with a copy button: phone, email, address. */
export function ContactLines({ phone, email, address, className }: Contact & { className?: string }) {
  const copy = (v: string) => navigator.clipboard?.writeText(v).then(() => toast.success("Copied"), () => toast.error("Could not copy"))
  const row = (Icon: typeof Phone, value: string, href: string, external?: boolean) => (
    <li className="group flex items-center gap-2 text-sm">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <a href={href} title={value} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="min-w-0 truncate hover:text-primary hover:underline">{value}</a>
      <button type="button" onClick={() => copy(value)} className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 focus:opacity-100 hover:text-foreground" aria-label={`Copy ${value}`}><Copy className="size-3" /></button>
    </li>
  )
  if (!phone && !email && !address) return <p className={cn("text-xs text-muted-foreground", className)}>No contact details recorded.</p>
  return (
    <ul className={cn("space-y-1", className)}>
      {phone && row(Phone, phone, telHref(phone))}
      {email && row(Mail, email, mailHref(email))}
      {address && row(MapPin, address, mapsHref(address), true)}
    </ul>
  )
}
