"use client"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Phone,
  Mail,
  MessageCircle,
  MessageSquare,
  Cake,
  CalendarHeart,
  GraduationCap,
  MapPin,
  Star,
  HandCoins,
  Pencil,
  Hash,
  User,
  Droplets,
  Gem,
  FileText,
  BadgeCheck,
  Home,
  Footprints,
  HeartHandshake,
} from "lucide-react"
import { PersonAvatar } from "@/components/page"
import { post, qs, useApi, usePaginated } from "@/lib/api"
import { useState } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { DialogFooter, DialogHeader } from "@/components/ui/dialog"
import { FieldError, bool, num, str, useApiForm } from "@/components/form"
import { VisitDialog, refreshCare } from "@/components/care-content"
import { useAuth } from "@/lib/auth"
import { CURRENCY, daysToBirthday, longDate, money, tenure, titleCase, today, yearsSince, date } from "@/lib/format"
import { OFFERTORY_CATEGORIES, type Baptism, type Member, type Offertory, type OffertorySummary, type Marriage } from "@/lib/types"
import { rite, useSettings } from "@/lib/settings"
import { cn } from "@/lib/utils"

/** "5 March" — day and month only. */
function birthdayLabel(dob: string | null) {
  if (!dob) return "—"
  const [y, m, d] = dob.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "long" })
}

const COUNTRY_CODE = process.env.NEXT_PUBLIC_PHONE_COUNTRY_CODE ?? "256"

/** "0772 123456" → "256772123456" for wa.me links. */
function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (phone.trim().startsWith("+")) return digits
  return digits.startsWith("0") ? COUNTRY_CODE + digits.slice(1) : digits
}

type ViewMemberDialogProps = {
  member: Member
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function ViewMemberDialog({ member: listed, open, onOpenChange, onEdit }: ViewMemberDialogProps) {
  const { can } = useAuth()
  // The list row is enough to open instantly; the full record adds positions etc.
  const { data: full } = useApi<Member>(open ? `/members/${listed.id}` : null)
  const member = full ?? listed
  const deceased = member.status === "deceased"
  const [action, setAction] = useState<"death" | "visit" | null>(null)
  const age = yearsSince(member.dateOfBirth)
  const bday = daysToBirthday(member.dateOfBirth)
  const years = yearsSince(member.dateJoined)
  const home = [member.village, member.parish, member.subCounty].filter(Boolean)
  const primary = member.ministries.find((m) => m.isPrimary)?.name ?? member.ministry

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl [&>[data-slot=dialog-close]]:z-10 [&>[data-slot=dialog-close]]:text-primary-foreground">
        {/* Hero */}
        <div className={cn("relative overflow-hidden rounded-t-2xl px-6 pb-6 pt-8 text-primary-foreground", deceased ? "bg-foreground" : "bg-primary")}>
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-fuchsia-300/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
            <PersonAvatar name={member.name} className="size-16 bg-card text-lg ring-4 ring-primary-foreground/20" />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-2xl text-primary-foreground">{member.name}</DialogTitle>
              <DialogDescription className="mt-1 text-primary-foreground/75">
                {deceased ? (
                  <>Called to glory {member.dateOfDeath ? longDate(member.dateOfDeath) : ""}{age !== null ? ` · aged ${age}` : ""}</>
                ) : (
                  <>
                    {primary ? `${primary} · ` : ""}
                    {years === null ? "Member" : years === 0 ? "Joined this year" : `${years} year${years === 1 ? "" : "s"} in fellowship`}
                  </>
                )}
              </DialogDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="border-transparent bg-primary-foreground/15 capitalize text-primary-foreground">
                  <span className={`size-1.5 rounded-full ${member.status === "active" ? "bg-gold" : "bg-primary-foreground/50"}`} />
                  {member.status}
                </Badge>
                {member.sundaySchool && (
                  <Badge className="border-transparent bg-primary-foreground/15 text-primary-foreground">
                    <GraduationCap /> Sunday school
                  </Badge>
                )}
                {bday !== null && bday <= 14 && (
                  <Badge className="border-transparent bg-gold text-gold-foreground">
                    <Cake /> {bday === 0 ? "Birthday today!" : `Birthday in ${bday} day${bday === 1 ? "" : "s"}`}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reach out */}
        {(member.phone || member.email) && (
          <div className="grid grid-cols-2 gap-2 border-b bg-secondary/40 px-6 py-4 sm:grid-cols-4">
            {member.phone && (
              <>
                <ContactButton href={`tel:${member.phone}`} icon={Phone} label="Call" />
                <ContactButton href={`https://wa.me/${whatsappNumber(member.phone)}`} icon={MessageCircle} label="WhatsApp" external />
                <ContactButton href={`sms:${member.phone}`} icon={MessageSquare} label="Text" />
              </>
            )}
            {member.email && <ContactButton href={`mailto:${member.email}`} icon={Mail} label="Email" />}
          </div>
        )}

        <div className="space-y-7 px-6 py-6">
          {/* Key facts */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact icon={CalendarHeart} label="Member since" value={longDate(member.dateJoined)} sub={tenure(member.dateJoined)} />
            <Fact
              icon={Cake}
              label="Birthday"
              value={birthdayLabel(member.dateOfBirth)}
              sub={age !== null ? `${age} years old` : "Not recorded"}
            />
            <Fact icon={User} label="Gender" value={member.gender === "male" ? "Male" : "Female"} />
            <Fact icon={Hash} label="Pledge no." value={member.pledgeNumber ?? "—"} sub={`Member #${member.id}`} />
          </section>

          {/* Contact & home */}
          <section className="grid gap-6 sm:grid-cols-2">
            <div>
              <SectionTitle>Contact</SectionTitle>
              <dl className="space-y-2.5 text-sm">
                <Row icon={Phone} value={member.phone} />
                <Row icon={Mail} value={member.email} />
                {member.address && <Row icon={MapPin} value={member.address} />}
              </dl>
              {member.nextOfKin?.name && (
                <div className="mt-4 rounded-xl border bg-secondary/40 p-3 text-sm">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Next of kin</p>
                  <p className="font-semibold">
                    {member.nextOfKin.name}
                    {member.nextOfKin.relationship && <span className="font-normal text-muted-foreground"> · {member.nextOfKin.relationship}</span>}
                  </p>
                  {member.nextOfKin.phone && (
                    <a href={`tel:${member.nextOfKin.phone}`} className="text-primary hover:underline tabular">{member.nextOfKin.phone}</a>
                  )}
                </div>
              )}
            </div>
            <div>
              <SectionTitle>Home</SectionTitle>
              {home.length ? (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Village</dt>
                  <dd className="font-medium">{member.village ?? "—"}</dd>
                  <dt className="text-muted-foreground">Parish</dt>
                  <dd className="font-medium">{member.parish ?? "—"}</dd>
                  <dt className="text-muted-foreground">Sub county</dt>
                  <dd className="font-medium">{member.subCounty ?? "—"}</dd>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">No home location recorded.</p>
              )}
            </div>
          </section>

          {/* Ministries */}
          <section>
            <SectionTitle>Serves in</SectionTitle>
            {member.ministries.length ? (
              <div className="flex flex-wrap gap-2">
                {member.ministries.map((m) => (
                  <span
                    key={m.id}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium",
                      m.isPrimary ? "border-primary/25 bg-primary/10 text-primary" : "bg-card",
                    )}
                  >
                    {m.isPrimary && <Star className="size-3.5 fill-current" />}
                    {m.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not part of a ministry yet.</p>
            )}
          </section>

          {(member.positions?.length || member.cellGroup || member.household || member.sundaySchoolClass) && (
            <section>
              <SectionTitle>Church life</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {member.positions?.filter((p) => p.current).map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-sm font-medium">
                    <BadgeCheck className="size-3.5 text-gold-foreground dark:text-gold" /> {p.title}
                    <span className="font-normal text-muted-foreground">· {p.scope}{p.startDate ? ` since ${new Date(p.startDate).getFullYear()}` : ""}</span>
                  </span>
                ))}
                {member.cellGroup && <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"><Home className="size-3.5 text-primary" /> {member.cellGroup}</span>}
                {member.household && <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"><HeartHandshake className="size-3.5 text-primary" /> {member.household}</span>}
                {member.sundaySchoolClass && <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"><GraduationCap className="size-3.5 text-primary" /> Sunday school: {member.sundaySchoolClass}</span>}
              </div>
            </section>
          )}

          {open && <Sacraments memberId={member.id} />}

          {can("finance.view") && open && <GivingRecord memberId={member.id} />}
          {can("finance.view") && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/statements/print?memberId=${member.id}&year=${new Date().getFullYear()}`} target="_blank" rel="noreferrer">
                <FileText className="size-4" /> {new Date().getFullYear()} giving statement
              </a>
            </Button>
          )}
        </div>

        {onEdit && (
          <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t bg-card/95 px-6 py-3 backdrop-blur">
            {!deceased && (
              <>
                <Button variant="ghost" className="mr-auto text-muted-foreground" onClick={() => setAction("death")}>
                  ✝ Record death
                </Button>
                <Button variant="outline" onClick={() => setAction("visit")}>
                  <Footprints className="size-4" /> Log a visit
                </Button>
              </>
            )}
            <Button onClick={onEdit}>
              <Pencil className="size-4" /> Edit details
            </Button>
          </div>
        )}
      </DialogContent>
      <RecordDeathDialog member={member} open={action === "death"} onOpenChange={(o) => !o && setAction(null)} />
      <VisitDialog memberId={member.id} memberName={member.name} open={action === "visit"} onOpenChange={(o) => !o && setAction(null)} />
    </Dialog>
  )
}

/** One step: mark deceased, open a care case, and optionally announce, open welfare and text the next of kin. */
function RecordDeathDialog({ member, open, onOpenChange }: { member: Member; open: boolean; onOpenChange: (o: boolean) => void }) {
  const kin = member.nextOfKin
  const { handleSubmit, pending, error, reset } = useApiForm(async (fd) => {
    const res = await post<{ data: { smsSent: boolean } }>(`/members/${member.id}/death`, {
      dateOfDeath: str(fd, "dateOfDeath"), burialDate: str(fd, "burialDate"), burialPlace: str(fd, "burialPlace"), notes: str(fd, "notes"),
      announce: bool(fd, "announce"), openWelfare: bool(fd, "openWelfare"), welfareAmount: num(fd, "welfareAmount"), smsNextOfKin: bool(fd, "smsNextOfKin"),
    })
    refreshCare()
    if (res.data.smsSent) toast.message(`Condolence SMS sent to ${kin?.name}`)
    onOpenChange(false)
  }, `${member.name} recorded as deceased`)
  return (
    <Dialog open={open} onOpenChange={(o) => (o || reset(), onOpenChange(o))}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record the death of {member.name}</DialogTitle>
          <DialogDescription>Their record is kept but they leave active lists, SMS and Sunday school; their positions end.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="d-date">Date of death</Label><Input id="d-date" name="dateOfDeath" type="date" max={today()} defaultValue={today()} required /><FieldError error={error} name="dateOfDeath" /></div>
          <div className="space-y-2"><Label htmlFor="d-bd">Burial date</Label><Input id="d-bd" name="burialDate" type="date" /><FieldError error={error} name="burialDate" /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="d-bp">Burial place</Label><Input id="d-bp" name="burialPlace" placeholder="Ancestral home, village…" /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="d-n">Notes</Label><Textarea id="d-n" name="notes" rows={2} placeholder="Vigil, requiem service, transport…" /></div>
          <div className="space-y-2 rounded-xl border p-3 sm:col-span-2">
            <CheckRow id="d-ann" name="announce" label="Post a burial announcement" hint="Pinned on Announcements and the Sunday sheet" defaultChecked />
            <CheckRow id="d-wel" name="openWelfare" label="Open a welfare case for the family" hint="Bereavement support, awaiting approval" defaultChecked />
            <div className="pl-8"><Input name="welfareAmount" type="number" min="0" step="0.01" placeholder={`Amount requested (${CURRENCY}), optional`} className="h-9" /></div>
            <CheckRow id="d-sms" name="smsNextOfKin" label={kin?.phone ? `Text condolences to ${kin.name} (${kin.phone})` : "Text condolences to next of kin"}
              hint={kin?.phone ? undefined : "No next-of-kin phone on record"} defaultChecked={!!kin?.phone} disabled={!kin?.phone} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending} className="bg-foreground text-background hover:bg-foreground/90">{pending ? "Saving…" : "Record death"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CheckRow({ id, name, label, hint, defaultChecked, disabled }: { id: string; name: string; label: string; hint?: string; defaultChecked?: boolean; disabled?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <Switch id={id} name={name} defaultChecked={defaultChecked} disabled={disabled} className="mt-0.5" />
      <label htmlFor={id} className={cn("text-sm", disabled && "opacity-60")}>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </label>
    </div>
  )
}

/** Baptism / confirmation / dedication entries linked to this member. */
function Sacraments({ memberId }: { memberId: string }) {
  const settings = useSettings()
  const { rows, isLoading } = usePaginated<Baptism>(qs("/baptisms", { memberId, perPage: 10, page: 1 }))
  const { rows: marriages } = usePaginated<Marriage>(qs("/marriages", { memberId, perPage: 5, page: 1 }))
  if (isLoading) return null

  return (
    <section>
      <SectionTitle>Sacraments</SectionTitle>
      {rows.length === 0 && marriages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No baptism or confirmation recorded for this member.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {rows.map((b) => {
            const r = rite(b.kind, settings.denomination)
            return (
              <li key={b.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
                  <Droplets className="size-4" />
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-semibold">
                    {b.status === "completed" ? r.verb : `${r.label} planned`} · {longDate(b.date)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.status === "completed" ? b.certificateNumber : "Candidate"}
                    {b.officiant ? ` · ${b.officiant}` : ""}
                  </p>
                </div>
              </li>
            )
          })}
          {marriages.map((m) => {
            const spouse = m.groomMemberId === memberId ? m.brideName : m.groomName
            return (
              <li key={`m-${m.id}`}>
                <a href={`/marriages?open=${m.id}`} className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition hover:border-primary/30">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold-foreground dark:text-gold"><Gem className="size-4" /></span>
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">{m.status === "completed" ? `Married to ${spouse}` : `Engaged to ${spouse}`}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.status === "completed" ? "" : "Wedding "}{longDate(m.date)}{m.place ? ` · ${m.place}` : ""}</p>
                  </div>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** This member's giving: year-to-date total per category and the latest gifts. */
function GivingRecord({ memberId }: { memberId: string }) {
  const yearStart = `${new Date().getFullYear()}-01-01`
  const { data: summary } = useApi<OffertorySummary>(qs("/offertory/summary", { memberId, from: yearStart }))
  const { rows: recent, isLoading } = usePaginated<Offertory>(qs("/offertory", { memberId, perPage: 5, page: 1 }))

  return (
    <section>
      <SectionTitle>Stewardship · {new Date().getFullYear()}</SectionTitle>
      <div className="rounded-2xl border bg-secondary/30 p-4">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-muted-foreground">Given this year</span>
          <span className="font-display text-2xl font-semibold tabular">{summary ? money(summary.total) : "…"}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {OFFERTORY_CATEGORIES.map((c, i) => (
            <div key={c} className="rounded-xl bg-card px-3 py-2">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: `var(--chart-${i + 1})` }} />
                {titleCase(c)}
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular">{summary ? money(summary.byCategory[c].total) : "…"}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Latest gifts</p>
        {isLoading ? (
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        ) : recent.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <HandCoins className="size-4" /> No gifts recorded against this member.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: `var(--chart-${OFFERTORY_CATEGORIES.indexOf(o.category) + 1})` }}
                  />
                  {titleCase(o.category)}
                  <span className="text-muted-foreground">· {date(o.date)}</span>
                </span>
                <span className="font-semibold tabular">{money(o.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{children}</h3>
}

function Fact({ icon: Icon, label, value, sub }: { icon: typeof Phone; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <Icon className="mb-2 size-4 text-primary" />
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function Row({ icon: Icon, value }: { icon: typeof Phone; value: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className={value ? "" : "text-muted-foreground"}>{value ?? "Not recorded"}</span>
    </div>
  )
}

function ContactButton({
  href,
  icon: Icon,
  label,
  external,
}: {
  href: string
  icon: typeof Phone
  label: string
  external?: boolean
}) {
  return (
    <Button variant="outline" size="sm" asChild className="h-9">
      <a href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
        <Icon className="size-4 text-primary" />
        {label}
      </a>
    </Button>
  )
}
