"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthLayout, AuthMark } from "@/components/auth-layout"
import { ApiError } from "@/lib/api"
import { homeFor, useAuth } from "@/lib/auth"

/** Self sign-up: a church registers itself and its first administrator, on a 30-day free trial. */
export default function SignupPage() {
  const { signup, user, loading } = useAuth()
  const router = useRouter()
  const [denomination, setDenomination] = useState("anglican")
  const [accept, setAccept] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace(homeFor(user))
  }, [loading, user, router])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const v = (k: string) => String(fd.get(k) ?? "").trim()
    setPending(true)
    setError(null)
    try {
      await signup({
        churchName: v("churchName"), denomination, name: v("name"), email: v("email"), phone: v("phone"),
        password: String(fd.get("password")), password_confirmation: String(fd.get("password_confirmation")), acceptTerms: accept,
      })
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Sign-up failed. Check your connection and try again.", {}))
    } finally {
      setPending(false)
    }
  }
  const fieldError = (name: string) => error?.field(name) && <p className="text-sm text-destructive">{error.field(name)}</p>

  return (
    <AuthLayout quote="Unless the Lord builds the house, the builders labour in vain." cite="Psalm 127:1">
      <div className="w-full max-w-md">
        <AuthMark />
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-foreground">Start free · 30 days · no card needed</p>
        <h1 className="mt-2 text-3xl font-semibold">Register your church</h1>
        <p className="mt-2 text-muted-foreground">You&apos;ll be the church&apos;s administrator and can invite your staff afterwards.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <fieldset className="space-y-4">
            <legend className="mb-1 text-sm font-semibold">Your church</legend>
            <div className="space-y-2">
              <Label htmlFor="churchName">Church name</Label>
              <Input id="churchName" name="churchName" placeholder="e.g. St. Paul's Church, Ntinda" required minLength={3} autoFocus />
              {fieldError("churchName")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="denomination">Tradition</Label>
              <Select value={denomination} onValueChange={(v) => v && setDenomination(v)}>
                <SelectTrigger id="denomination" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anglican">Anglican (Church of Uganda)</SelectItem>
                  <SelectItem value="pentecostal">Pentecostal / Born-again</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Sets the right words, e.g. confirmation vs child dedication.</p>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-1 text-sm font-semibold">You (administrator)</legend>
            <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" name="name" autoComplete="name" placeholder="Rev. Canon …" required />{fieldError("name")}</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required />{fieldError("email")}</div>
              <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="07…" required />{fieldError("phone")}</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />{fieldError("password")}</div>
              <div className="space-y-2"><Label htmlFor="password_confirmation">Confirm password</Label><Input id="password_confirmation" name="password_confirmation" type="password" autoComplete="new-password" required /></div>
            </div>
            <p className="text-xs text-muted-foreground">At least 8 characters, with letters and numbers.</p>
          </fieldset>

          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={accept} onCheckedChange={(c) => setAccept(c === true)} className="mt-0.5" aria-label="Accept the terms" />
            <span className="text-muted-foreground">I agree to the terms of service and to keep members&apos; personal data safe, as the Data Protection and Privacy Act requires.</span>
          </label>
          {fieldError("acceptTerms")}
          {error && !Object.keys(error.errors).length && <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error.message}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={pending || !accept}>{pending ? "Setting up your church…" : "Create my church account"}</Button>
          <ul className="grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
            {["Members, families & cells", "Offertory, pledges & projects", "Accounts & financial reports", "Calendar, SMS & reminders"].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="size-4 text-success" />{f}</li>
            ))}
          </ul>
        </form>

        <p className="mt-8 text-sm text-muted-foreground">Already on Synago? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
      </div>
    </AuthLayout>
  )
}
