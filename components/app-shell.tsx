"use client"

import { Suspense, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ShieldAlert, Church } from "lucide-react"
import { Sidebar, navItemFor } from "@/components/sidebar"
import { EmptyState, Page } from "@/components/page"
import { CommandPalette } from "@/components/command-palette"
import { TopBar } from "@/components/top-bar"
import { AccountBanner } from "@/components/account-banner"
import { useAuth } from "@/lib/auth"

/** Authenticated layout: sidebar + content. Redirects to /login when there's no session. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, can } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    // the platform owner has no church: their home is the console
    if (!loading && user?.platformAdmin && !user.church) router.replace("/platform")
  }, [loading, user, router, pathname])

  if (loading || !user || (user.platformAdmin && !user.church)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <span className="flex size-12 animate-pulse items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Church className="size-6" />
        </span>
        <p className="text-sm text-muted-foreground">Opening the church office…</p>
      </div>
    )
  }

  const page = navItemFor(pathname)
  const allowed = !page?.permission || can(page.permission)

  return (
    <div className="flex h-screen overflow-hidden bg-background print:block print:h-auto print:overflow-visible">
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto pt-14 md:pt-0 print:overflow-visible print:pt-0"
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 8)}
      >
        <Suspense><AccountBanner /></Suspense>
        <TopBar scrolled={scrolled} />
        {allowed ? (
          <Suspense>{children}</Suspense>
        ) : (
          <Page>
            <EmptyState
              icon={ShieldAlert}
              title="This page isn't available to your role"
              description="Ask an administrator if you need access."
            />
          </Page>
        )}
      </main>
      <Suspense>
        <CommandPalette />
      </Suspense>
    </div>
  )
}
