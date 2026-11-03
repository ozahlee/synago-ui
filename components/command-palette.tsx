"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import {
  Search,
  CornerDownLeft,
  User,
  UserRoundPlus,
  UsersRound,
  Home,
  Droplets,
  Gem,
  Handshake,
  HandHeart,
  Megaphone,
  ShieldCheck,
  History,
  ArrowRight,
  Hammer,
  HeartHandshake,
  Building2,
  type LucideIcon,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { ViewMemberDialog } from "@/components/view-member-dialog"
import { NAVIGATION } from "@/components/sidebar"
import { qs, useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { Member } from "@/lib/types"
import { cn } from "@/lib/utils"

type Hit = { type: string; id: string; title: string; subtitle: string | null; status?: string | null }
type Results = Partial<Record<string, Hit[]>>

const GROUPS: Record<string, { label: string; icon: LucideIcon }> = {
  members: { label: "Members", icon: User },
  visitors: { label: "Visitors", icon: UserRoundPlus },
  ministries: { label: "Ministries", icon: UsersRound },
  cellGroups: { label: "Cell groups", icon: Home },
  baptisms: { label: "Baptisms & confirmations", icon: Droplets },
  marriages: { label: "Marriages", icon: Gem },
  households: { label: "Families", icon: HeartHandshake },
  pledges: { label: "Pledges", icon: Handshake },
  projects: { label: "Projects", icon: Hammer },
  organisations: { label: "Organisations", icon: Building2 },
  welfare: { label: "Welfare", icon: HandHeart },
  announcements: { label: "Announcements", icon: Megaphone },
  staff: { label: "Staff", icon: ShieldCheck },
}
const ICON_BY_TYPE: Record<string, LucideIcon> = {
  member: User, visitor: UserRoundPlus, ministry: UsersRound, cellGroup: Home, baptism: Droplets, marriage: Gem,
  pledge: Handshake, project: Hammer, household: HeartHandshake, organisation: Building2, welfare: HandHeart, announcement: Megaphone, staff: ShieldCheck,
}

/** Where a result lives. Members open in place; everything else deep-links to its page. */
function hrefFor(h: Hit): string | null {
  const q = encodeURIComponent(h.title.split(" & ")[0])
  switch (h.type) {
    case "visitor": return `/visitors?open=${h.id}`
    case "ministry": return `/ministries?open=${h.id}`
    case "cellGroup": return `/cell-groups?open=${h.id}`
    case "baptism": return `/baptisms?tab=${h.status ?? "completed"}&q=${q}`
    case "marriage": return `/marriages?tab=${h.status ?? "completed"}&q=${q}`
    case "pledge": return `/pledges?q=${q}`
    case "project": return `/projects/view?id=${h.id}`
    case "household": return `/households?open=${h.id}`
    case "organisation": return `/organisations`
    case "welfare": return `/welfare?tab=all`
    case "announcement": return `/announcements?when=${h.status ?? "upcoming"}`
    case "staff": return `/staff`
    default: return null
  }
}

const RECENT_KEY = "synago.recentSearch"
const readRecent = (): Hit[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]")
  } catch {
    return []
  }
}
const pushRecent = (h: Hit) => {
  try {
    const next = [h, ...readRecent().filter((r) => !(r.type === h.type && r.id === h.id))].slice(0, 6)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable */
  }
}

export function CommandPalette() {
  const router = useRouter()
  const { can } = useAuth()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [recent, setRecent] = useState<Hit[]>([])
  const [memberId, setMemberId] = useState<string | null>(null)

  // ⌘K / Ctrl+K anywhere; "/" when not typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName))
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener("keydown", onKey)
    window.addEventListener("synago:search", onOpen)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("synago:search", onOpen)
    }
  }, [])

  useEffect(() => {
    if (open) setRecent(readRecent())
    else setQuery("")
  }, [open])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200)
    return () => clearTimeout(t)
  }, [query])

  const { data: results, isLoading } = useApi<Results>(open && debounced.length >= 2 ? qs("/search", { q: debounced }) : null, {
    keepPreviousData: true,
  })
  const { data: member } = useApi<Member>(memberId ? `/members/${memberId}` : null)

  const pages = useMemo(() => {
    const q = query.trim().toLowerCase()
    const allowed = NAVIGATION.filter((n) => !n.permission || can(n.permission))
    return q ? allowed.filter((n) => n.name.toLowerCase().includes(q) || n.group.toLowerCase().includes(q)).slice(0, 5) : []
  }, [query, can])

  const choose = useCallback(
    (h: Hit) => {
      pushRecent(h)
      setOpen(false)
      if (h.type === "member") return setMemberId(h.id)
      const href = hrefFor(h)
      if (href) router.push(href)
    },
    [router],
  )

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const groups = Object.entries(results ?? {}).filter(([, hits]) => hits?.length) as [string, Hit[]][]
  const searching = debounced.length >= 2
  const nothing = searching && !isLoading && groups.length === 0 && pages.length === 0

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="top-[12vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Command shouldFilter={false} loop className="flex max-h-[70vh] flex-col">
            <div className="flex items-center gap-3 border-b px-4">
              <Search className="size-5 shrink-0 text-muted-foreground" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                autoFocus
                placeholder="Search members, pledge no., visitors, registers, pages…"
                className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              {isLoading && searching && <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
              <kbd className="hidden shrink-0 rounded-md border bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground sm:block">Esc</kbd>
            </div>

            <Command.List className="overflow-y-auto overscroll-contain p-2">
              {nothing && (
                <Command.Empty className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nothing found for &ldquo;{debounced}&rdquo;. Try a surname, phone number or pledge number.
                </Command.Empty>
              )}

              {!query && recent.length > 0 && (
                <PaletteGroup heading="Recently opened">
                  {recent.map((h) => (
                    <ResultItem key={`r-${h.type}-${h.id}`} hit={h} icon={History} onSelect={() => choose(h)} />
                  ))}
                </PaletteGroup>
              )}

              {!query && (
                <PaletteGroup heading="Jump to">
                  {NAVIGATION.filter((n) => (!n.permission || can(n.permission)) && ["/members", "/offertory", "/visitors", "/attendance", "/announcements"].includes(n.href)).map((n) => (
                    <PageItem key={n.href} icon={n.icon} name={n.name} group={n.group} onSelect={() => go(n.href)} />
                  ))}
                </PaletteGroup>
              )}

              {groups.map(([key, hits]) => (
                <PaletteGroup key={key} heading={GROUPS[key]?.label ?? key}>
                  {hits.map((h) => (
                    <ResultItem key={`${h.type}-${h.id}`} hit={h} query={debounced} onSelect={() => choose(h)} />
                  ))}
                </PaletteGroup>
              ))}

              {pages.length > 0 && (
                <PaletteGroup heading="Pages">
                  {pages.map((n) => (
                    <PageItem key={n.href} icon={n.icon} name={n.name} group={n.group} onSelect={() => go(n.href)} />
                  ))}
                </PaletteGroup>
              )}
            </Command.List>

            <div className="hidden items-center gap-4 border-t bg-secondary/40 px-4 py-2 text-[11px] text-muted-foreground sm:flex">
              <span className="flex items-center gap-1"><kbd className="rounded border bg-card px-1">↑</kbd><kbd className="rounded border bg-card px-1">↓</kbd> move</span>
              <span className="flex items-center gap-1"><kbd className="rounded border bg-card px-1"><CornerDownLeft className="inline size-3" /></kbd> open</span>
              <span className="ml-auto">Results only include areas your role can see</span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>

      {member && (
        <ViewMemberDialog
          member={member}
          open={!!memberId}
          onOpenChange={(o) => !o && setMemberId(null)}
          onEdit={can("members.manage") ? () => (setMemberId(null), router.push(`/members?q=${encodeURIComponent(member.name)}`)) : undefined}
        />
      )}
    </>
  )
}

function PaletteGroup({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-muted-foreground"
    >
      {children}
    </Command.Group>
  )
}

const itemClass =
  "group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none data-[selected=true]:bg-primary/10 data-[selected=true]:text-foreground"

function Highlight({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>
  const i = text.toLowerCase().indexOf(query.toLowerCase())
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-gold/30 px-0.5 text-inherit">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  )
}

function ResultItem({ hit, query, icon, onSelect }: { hit: Hit; query?: string; icon?: LucideIcon; onSelect: () => void }) {
  const Icon = icon ?? ICON_BY_TYPE[hit.type] ?? Search
  return (
    <Command.Item value={`${hit.type}-${hit.id}`} onSelect={onSelect} className={itemClass}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium"><Highlight text={hit.title} query={query} /></span>
        {hit.subtitle && (
          <span className="block truncate text-xs text-muted-foreground"><Highlight text={hit.subtitle} query={query} /></span>
        )}
      </span>
      <ArrowRight className={cn("size-4 shrink-0 text-muted-foreground opacity-0 transition group-data-[selected=true]:opacity-100")} />
    </Command.Item>
  )
}

function PageItem({ icon: Icon, name, group, onSelect }: { icon: LucideIcon; name: string; group: string; onSelect: () => void }) {
  return (
    <Command.Item value={`page-${name}`} onSelect={onSelect} className={itemClass}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground">
        <Icon className="size-4" />
      </span>
      <span className="flex-1 font-medium">{name}</span>
      <span className="text-xs text-muted-foreground">{group}</span>
    </Command.Item>
  )
}
