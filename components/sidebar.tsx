"use client"

import {
  Scale,
  Mic2,
  Banknote,
  Contact,
  Gift,
  Landmark,
  CalendarRange,
  MessagesSquare,
  SlidersHorizontal,
  ChevronRight,
  LayoutDashboard,
  Users,
  HandCoins,
  Church,
  Wallet,
  PieChart,
  Bell,
  HeartHandshake,
  Menu,
  X,
  LogOut,
  UsersRound,
  Droplets,
  FileBarChart,
  Megaphone,
  ShieldCheck,
  Settings,
  UserRoundPlus,
  Home as HomeIcon,
  ClipboardCheck,
  Gem,
  HandHeart,
  Handshake,
  FileText,
  MessageSquareText,
  Search,
  School,
  Map,
  HeartPulse,
  Wheat,
  Hammer,
  HandHelping,
  BadgeCheck,
  UserCheck,
  CalendarDays,
  BellRing,
  BookOpen,
  Building2,
  ClipboardList,
  ShoppingBag,
  Network,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PersonAvatar } from "@/components/page"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { useApi } from "@/lib/api"
import { useSettings } from "@/lib/settings"
import { CHURCH_NAME } from "@/lib/format"
import { isMac, openSearch } from "@/lib/search"
import type { LucideIcon } from "lucide-react"

type NavItem = { name: string; href: string; icon: LucideIcon; permission?: string; group: string }

/** Major sections of the sidebar, in order. Items with group "Home" sit above them as direct links. */
export const NAV_CATEGORIES: Array<{ name: string; icon: LucideIcon }> = [
  { name: "People", icon: Contact },
  { name: "Church life", icon: Church },
  { name: "Giving", icon: Gift },
  { name: "Finance", icon: Landmark },
  { name: "Planning", icon: CalendarRange },
  { name: "Communication", icon: MessagesSquare },
  { name: "Administration", icon: SlidersHorizontal },
]

export const NAVIGATION: NavItem[] = [
  { name: "Overview", href: "/", icon: LayoutDashboard, group: "Home" },
  { name: "My groups", href: "/my-groups", icon: UserCheck, permission: "groups.lead", group: "Home" },

  { name: "Members", href: "/members", icon: Users, permission: "members.view", group: "People" },
  { name: "Visitors", href: "/visitors", icon: UserRoundPlus, permission: "members.view", group: "People" },
  { name: "Families", href: "/households", icon: HeartHandshake, permission: "members.view", group: "People" },
  { name: "Cell groups", href: "/cell-groups", icon: HomeIcon, permission: "members.view", group: "People" },
  { name: "Areas", href: "/areas", icon: Map, permission: "members.view", group: "People" },
  { name: "Ministries", href: "/ministries", icon: UsersRound, permission: "members.view", group: "People" },
  { name: "Church council", href: "/council", icon: Network, permission: "members.view", group: "People" },
  { name: "Positions", href: "/positions", icon: BadgeCheck, permission: "members.view", group: "People" },
  { name: "Guests & placements", href: "/guests", icon: Mic2, permission: "members.view", group: "People" },

  { name: "Attendance", href: "/attendance", icon: ClipboardCheck, permission: "members.view", group: "Church life" },
  { name: "Sunday school", href: "/sunday-school", icon: School, permission: "members.view", group: "Church life" },
  { name: "Baptisms", href: "/baptisms", icon: Droplets, permission: "members.view", group: "Church life" },
  { name: "Marriages", href: "/marriages", icon: Gem, permission: "members.view", group: "Church life" },
  { name: "Pastoral care", href: "/care", icon: HeartPulse, permission: "members.view", group: "Church life" },
  { name: "Outreach", href: "/outreach", icon: HandHelping, permission: "members.view", group: "Church life" },

  { name: "Offertory", href: "/offertory", icon: HandCoins, permission: "finance.view", group: "Giving" },
  { name: "Harvest", href: "/harvest", icon: Wheat, permission: "finance.view", group: "Giving" },
  { name: "Pledges", href: "/pledges", icon: Handshake, permission: "finance.view", group: "Giving" },
  { name: "Projects & giving", href: "/projects", icon: Hammer, permission: "finance.view", group: "Giving" },
  { name: "Organisations", href: "/organisations", icon: Building2, permission: "finance.view", group: "Giving" },
  { name: "Welfare fund", href: "/welfare", icon: HandHeart, permission: "welfare.manage", group: "Giving" },
  { name: "Personal collections", href: "/collections", icon: HeartHandshake, permission: "members.view", group: "Giving" },

  { name: "Accounts", href: "/accounts", icon: Wallet, permission: "finance.view", group: "Finance" },
  { name: "Loans", href: "/loans", icon: Banknote, permission: "finance.view", group: "Finance" },
  { name: "Requisitions", href: "/requisitions", icon: ClipboardList, permission: "requisitions.request|finance.view|requisitions.approve", group: "Finance" },
  { name: "Items & sales", href: "/sales", icon: ShoppingBag, permission: "finance.view|sales.manage", group: "Finance" },
  { name: "Budget", href: "/budget", icon: PieChart, permission: "finance.view", group: "Finance" },
  { name: "Financial reports", href: "/accounting", icon: Scale, permission: "finance.view", group: "Finance" },
  { name: "Tithe report", href: "/tithe-report", icon: FileBarChart, permission: "finance.view", group: "Finance" },
  { name: "Giving statements", href: "/statements", icon: FileText, permission: "finance.view", group: "Finance" },

  { name: "Calendar", href: "/calendar", icon: CalendarDays, group: "Planning" },
  { name: "Sermons", href: "/sermons", icon: BookOpen, permission: "members.view", group: "Planning" },
  { name: "Reminders", href: "/reminders", icon: BellRing, group: "Planning" },

  { name: "Announcements", href: "/announcements", icon: Megaphone, group: "Communication" },
  { name: "Bulk SMS", href: "/sms", icon: MessageSquareText, permission: "sms.send", group: "Communication" },
  { name: "Notifications", href: "/notifications", icon: Bell, group: "Communication" },

  { name: "Staff & access", href: "/staff", icon: ShieldCheck, permission: "users.manage", group: "Administration" },
  { name: "Church settings", href: "/settings", icon: Settings, permission: "settings.manage", group: "Administration" },
]

/** Which page a path belongs to: exact match, or the section it sits under (e.g. /projects/view → Projects). */
export const navItemFor = (pathname: string) =>
  NAVIGATION.find((n) => n.href === pathname) ?? NAVIGATION.filter((n) => n.href !== "/" && pathname.startsWith(`${n.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]

const OPEN_KEY = "synago.nav.open"

/** "Saint James Wigua" → "SJW"; skips small words like "of", "the". */
function churchInitials(name: string) {
  const words = name.split(/\s+/).filter((w) => w && !/^(of|the|and|&|de|la)$/i.test(w))
  return (words.length > 1 ? words.slice(0, 3).map((w) => w[0]) : [name.slice(0, 2)]).join("").toUpperCase()
}

function Brand() {
  const settingsName = useSettings().churchName
  const { user } = useAuth()
  // the church from the login is known at once; settings follow (and reflect renames)
  const churchName = (settingsName !== CHURCH_NAME ? settingsName : user?.church?.name) ?? settingsName
  // Keep the name on one line: step the size down for longer names, then truncate (full name on hover).
  const size = churchName.length <= 12 ? "text-lg" : churchName.length <= 18 ? "text-base" : "text-[15px]"
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3" title={churchName}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-[13px] font-bold tracking-wide text-primary-foreground shadow-sm shadow-primary/30">
        {churchInitials(churchName)}
      </span>
      <span className="min-w-0 leading-tight">
        <span className={`block truncate font-display font-semibold text-sidebar-foreground ${size}`}>{churchName}</span>
        <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Church Office</span>
      </span>
    </Link>
  )
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { user, can, logout } = useAuth()
  const { data: unread } = useApi<{ count: number }>("/notifications/unread-count", { refreshInterval: 60_000 })

  useEffect(() => setIsOpen(false), [pathname])
  const [mac, setMac] = useState(false)
  useEffect(() => setMac(isMac()), [])

  const broad = can("members.view") || can("finance.view")
  // Position-holders without office access don't get the church-wide overview.
  const items = NAVIGATION.filter((item) => (!item.permission || can(item.permission)) && (item.href !== "/" || broad))
  const top = items.filter((i) => i.group === "Home")
  const categories = NAV_CATEGORIES.map((c) => ({ ...c, items: items.filter((i) => i.group === c.name) })).filter((c) => c.items.length)
  const activeHref = navItemFor(pathname)?.href
  const activeGroup = navItemFor(pathname)?.group
  const badgeFor = (item: NavItem) => (item.href === "/notifications" && unread?.count ? unread.count : undefined)

  // Open sections are remembered per browser; the section holding the current page always opens.
  const [open, setOpen] = useState<Record<string, boolean>>({})
  useEffect(() => {
    let saved: Record<string, boolean> = {}
    try {
      saved = JSON.parse(localStorage.getItem(OPEN_KEY) ?? "{}")
    } catch {}
    setOpen(saved)
  }, [])
  useEffect(() => {
    if (activeGroup && activeGroup !== "Home") setOpen((o) => (o[activeGroup] ? o : { ...o, [activeGroup]: true }))
  }, [activeGroup])
  const toggle = (name: string) =>
    setOpen((o) => {
      const next = { ...o, [name]: !o[name] }
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(next))
      } catch {}
      return next
    })

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur md:hidden print:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={openSearch} aria-label="Search">
            <Search className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-out md:relative md:w-64 md:translate-x-0 print:hidden",
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center justify-between px-5">
            <Brand />
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsOpen(false)} aria-label="Close menu">
              <X className="size-5" />
            </Button>
          </div>

          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                openSearch()
              }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-sidebar-border bg-card/80 px-3 py-2 text-sm text-muted-foreground shadow-xs transition hover:border-primary/30 hover:text-foreground"
            >
              <Search className="size-4" />
              <span className="flex-1 text-left">Search…</span>
              <kbd className="rounded-md border bg-secondary px-1.5 text-[11px] font-medium">{mac ? "⌘" : "Ctrl"} K</kbd>
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-2" aria-label="Main">
            {top.map((item) => <NavLink key={item.href} item={item} active={activeHref === item.href} badge={badgeFor(item)} />)}
            {top.length > 0 && <div className="!my-3 mx-3 border-t border-sidebar-border" />}
            {categories.map(({ name, icon: Icon, items: list }) => {
              // a section the user can only see one page of is shown as that page
              if (list.length === 1) return <NavLink key={name} item={list[0]} active={activeHref === list[0].href} badge={badgeFor(list[0])} />
              const expanded = !!open[name]
              const containsActive = list.some((i) => i.href === activeHref)
              const badge = list.reduce((n, i) => n + (badgeFor(i) ?? 0), 0)
              const id = `nav-${name.toLowerCase().replace(/\s+/g, "-")}`
              return (
                <div key={name}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={id}
                    onClick={() => toggle(name)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                      containsActive && !expanded ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className={cn("size-[18px]", containsActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground")} />
                    <span className="flex-1 text-left">{name}</span>
                    {!expanded && badge > 0 && <Count n={badge} />}
                    <ChevronRight className={cn("size-4 text-muted-foreground transition-transform duration-200", expanded && "rotate-90")} />
                  </button>
                  <div id={id} className={cn("grid transition-[grid-template-rows] duration-200 ease-out", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                    <div className="overflow-hidden">
                      <div className="relative ml-[21px] space-y-0.5 border-l border-sidebar-border py-1 pl-2">
                        {list.map((item) => <NavLink key={item.href} item={item} active={activeHref === item.href} badge={badgeFor(item)} nested tabIndex={expanded ? 0 : -1} />)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </nav>

          <div className="m-3 rounded-2xl border border-sidebar-border bg-card/70 p-3">
            <div className="flex items-center gap-3">
              <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3 rounded-xl hover:opacity-80" title="Your profile">
                {user && <PersonAvatar name={user.name} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-sidebar-foreground">{user?.name}</p>
                  <p className="truncate text-xs capitalize text-muted-foreground">{user?.roles.join(", ")}</p>
                </div>
              </Link>
              <Button variant="ghost" size="icon-sm" onClick={logout} aria-label="Log out" title="Log out">
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-[2px] md:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  )
}

function Count({ n }: { n: number }) {
  return <span className="min-w-5 rounded-full bg-gold px-1.5 py-0.5 text-center text-[11px] font-semibold text-gold-foreground tabular">{n}</span>
}

function NavLink({ item, active, badge, nested, tabIndex }: { item: NavItem; active: boolean; badge?: number; nested?: boolean; tabIndex?: number }) {
  return (
    <Link
      href={item.href}
      tabIndex={tabIndex}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
        nested ? "py-1.5" : "py-2",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      {active && <span className={cn("absolute inset-y-1.5 w-[3px] rounded-full bg-primary", nested ? "-left-[10px]" : "left-0")} />}
      <item.icon className={cn(nested ? "size-4" : "size-[18px]", active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground")} />
      <span className="flex-1 truncate">{item.name}</span>
      {!!badge && <Count n={badge} />}
    </Link>
  )
}
