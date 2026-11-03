"use client"

import { Check, KeyRound, Mail, Phone, ShieldCheck, UserRound, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { FieldError, str, useApiForm } from "@/components/form"
import { Page, PageHeader, PersonAvatar } from "@/components/page"
import { patch, put } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { PERMISSION_LABELS, ROLE_BLURB } from "@/lib/permissions"
import type { User } from "@/lib/types"

export function ProfileContent() {
  const { user, setUser } = useAuth()

  const details = useApiForm(async (fd) => {
    const res = await patch<{ data: User }>("/auth/me", { name: str(fd, "name"), email: str(fd, "email"), phone: str(fd, "phone") })
    setUser(res.data)
  }, "Profile saved")

  const password = useApiForm(async (fd) => {
    await put("/auth/password", {
      currentPassword: str(fd, "currentPassword"),
      password: str(fd, "password"),
      password_confirmation: str(fd, "password_confirmation"),
    })
    ;(document.getElementById("password-form") as HTMLFormElement | null)?.reset()
  }, "Password changed. Other devices have been signed out.")

  if (!user) return null

  return (
    <Page className="max-w-5xl">
      <PageHeader eyebrow="Your account" title="Profile" description="Your details, password and what you can do in the church office." />

      <Card className="flex-row items-center gap-5 p-6">
        <PersonAvatar name={user.name} className="size-16 text-xl" />
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-semibold">{user.name}</h2>
          <p className="text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {user.roles.map((r) => (
              <Badge key={r} variant="gold" className="capitalize">
                <ShieldCheck /> {r}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-5 text-primary" /> Your details
            </CardTitle>
            <CardDescription>Shown to other staff and on records you create.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={details.handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="p-name">Full name</Label>
                <Input id="p-name" name="name" defaultValue={user.name} required />
                <FieldError error={details.error} name="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-email">Email (used to sign in)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="p-email" name="email" type="email" defaultValue={user.email} className="pl-9" required />
                </div>
                <FieldError error={details.error} name="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="p-phone" name="phone" type="tel" defaultValue={user.phone ?? ""} className="pl-9" />
                </div>
              </div>
              <Button type="submit" disabled={details.pending}>
                {details.pending ? "Saving…" : "Save details"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" /> Change password
            </CardTitle>
            <CardDescription>At least 8 characters. You&apos;ll stay signed in here; other devices are signed out.</CardDescription>
          </CardHeader>
          <CardContent>
            <form id="password-form" onSubmit={password.handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="p-current">Current password</Label>
                <Input id="p-current" name="currentPassword" type="password" autoComplete="current-password" required />
                <FieldError error={password.error} name="currentPassword" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-new">New password</Label>
                <Input id="p-new" name="password" type="password" autoComplete="new-password" minLength={8} required />
                <FieldError error={password.error} name="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-confirm">Confirm new password</Label>
                <Input id="p-confirm" name="password_confirmation" type="password" autoComplete="new-password" minLength={8} required />
              </div>
              <Button type="submit" variant="outline" disabled={password.pending}>
                {password.pending ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" /> Your access
          </CardTitle>
          <CardDescription>
            {user.roles.map((r) => ROLE_BLURB[r] ?? r).join(" · ")}. Ask an administrator if you need more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {Object.entries(PERMISSION_LABELS).map(([key, p]) => {
              const has = user.permissions.includes(key)
              return (
                <li key={key} className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm">
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full ${has ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
                  >
                    {has ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                  </span>
                  <span className={has ? "" : "text-muted-foreground"}>{p.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{p.area}</span>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </Page>
  )
}
