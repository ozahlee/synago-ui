"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Search } from "lucide-react"
import { PersonAvatar } from "@/components/page"
import { useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { isMac, openSearch } from "@/lib/search"
import { cn } from "@/lib/utils"

const HINTS = ["members or pledge no.", "a visitor's name", "a baptism certificate", "a cell group", "a pledge or welfare case", "any page"]

/**
 * Floating bar pinned to the top of the content area (desktop): global search in the middle,
 * notifications and profile on the right. It gains a glassy backdrop once the page scrolls under it.
 */
export function TopBar({ scrolled }: { scrolled: boolean }) {
  const { user } = useAuth()
  const { data: unread } = useApi<{ count: number }>("/notifications/unread-count", { refreshInterval: 60_000 })
  const [mac, setMac] = useState(false)
  const [hint, setHint] = useState(0)

  useEffect(() => setMac(isMac()), [])
  useEffect(() => {
    const t = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 3500)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="pointer-events-none sticky top-0 z-20 hidden px-6 pt-4 md:block lg:px-10 print:hidden">
      {/* fade so content scrolling underneath doesn't show above/around the floating bar */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 -bottom-6 bg-gradient-to-b from-background via-background/90 to-transparent transition-opacity duration-300",
          scrolled ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "pointer-events-auto relative mx-auto flex max-w-7xl items-center gap-3 rounded-2xl border px-2 py-2 transition-all duration-300",
          scrolled ? "border-border/80 bg-card/90 shadow-lg shadow-foreground/5 backdrop-blur-xl" : "border-transparent bg-transparent",
        )}
      >
        <button
          type="button"
          onClick={openSearch}
          className="group flex h-11 max-w-xl flex-1 items-center gap-3 rounded-xl border border-border/80 bg-card px-4 text-sm text-muted-foreground shadow-soft transition hover:border-primary/40 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label="Search everything"
        >
          <Search className="size-[18px] shrink-0 text-primary" />
          <span className="flex-1 truncate text-left">
            Search <span key={hint} className="inline-block animate-in fade-in slide-in-from-bottom-1 duration-300">{HINTS[hint]}</span>
          </span>
          <kbd className="flex shrink-0 items-center gap-0.5 rounded-md border bg-secondary px-1.5 py-0.5 text-[11px] font-medium">
            {mac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/notifications"
            aria-label={unread?.count ? `Notifications, ${unread.count} unread` : "Notifications"}
            className="relative flex size-11 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-card hover:text-foreground"
          >
            <Bell className="size-5" />
            {!!unread?.count && (
              <span className="absolute right-2 top-2 flex min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground ring-2 ring-background tabular">
                {unread.count}
              </span>
            )}
          </Link>
          {user && (
            <Link href="/profile" className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-3 transition hover:bg-card" title="Your profile">
              <PersonAvatar name={user.name} />
              <span className="hidden text-left leading-tight lg:block">
                <span className="block text-sm font-semibold text-foreground">{user.name.split(" ")[0]}</span>
                <span className="block text-xs capitalize text-muted-foreground">{user.roles[0]}</span>
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
