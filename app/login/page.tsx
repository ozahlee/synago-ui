"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout, AuthMark } from "@/components/auth-layout"
import { ApiError } from "@/lib/api"
import { homeFor, useAuth } from "@/lib/auth"

function LoginForm() {
  const { login, user, loading } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace(homeFor(user, next))
  }, [loading, user, router, next])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setPending(true)
    setError(null)
    try {
      await login(String(fd.get("email")), String(fd.get("password")))
    } catch (err) {
      setError(err instanceof ApiError ? (err.field("email") ?? err.message) : "Login failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <AuthMark />
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-foreground">Synago · Church office</p>
      <h1 className="mt-2 text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-muted-foreground">Sign in to care for your congregation, records and giving.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="username" placeholder="you@church.org" required autoFocus />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-8 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
        New to Synago?{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">Register your church</Link>: free for 30 days.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <AuthLayout quote="Let all things be done decently and in order." cite="1 Corinthians 14:40">
      <Suspense><LoginForm /></Suspense>
    </AuthLayout>
  )
}
