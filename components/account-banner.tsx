"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { MailWarning, Hourglass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { post } from "@/lib/api"
import { useAuth } from "@/lib/auth"

/** One slim notice at the top of the app: confirm your email, or the free trial is ending. */
export function AccountBanner() {
  const { user, refresh } = useAuth()
  const params = useSearchParams()
  const [sent, setSent] = useState(false)

  // back from the verification link
  useEffect(() => {
    if (params.get("verified") === "1") {
      toast.success("Email confirmed. Thank you!")
      refresh().catch(() => {})
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [params, refresh])

  if (!user?.church) return null
  if (!user.emailVerified) {
    return (
      <Bar icon={MailWarning}>
        <span>Please confirm your email address. We sent a link to <b>{user.email}</b>.</span>
        <Button size="sm" variant="outline" className="h-7" disabled={sent} onClick={async () => {
          await post("/auth/verify/resend")
          setSent(true)
          toast.success("Verification email sent")
        }}>{sent ? "Sent" : "Resend link"}</Button>
      </Bar>
    )
  }
  const days = user.church.trialDaysLeft
  if (user.church.status === "trial" && days !== null && days <= 7) {
    return (
      <Bar icon={Hourglass} tone="gold">
        <span>{days > 0 ? <>Your free trial ends in <b>{days} day{days === 1 ? "" : "s"}</b>.</> : <>Your free trial has ended.</>} Contact Synago to keep {user.church.name} running.</span>
      </Bar>
    )
  }
  return null
}

function Bar({ icon: Icon, tone = "warning", children }: { icon: typeof MailWarning; tone?: "warning" | "gold"; children: React.ReactNode }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm print:hidden ${tone === "gold" ? "border-gold/30 bg-gold/15" : "border-warning/30 bg-warning/10"}`}>
      <Icon className="size-4 shrink-0" />
      {children}
    </div>
  )
}
