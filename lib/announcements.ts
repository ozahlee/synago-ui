import { Cross, Heart, Handshake, HandHeart, HandCoins, Users, Megaphone, type LucideIcon } from "lucide-react"
import type { AnnouncementType } from "@/lib/types"

type Meta = { label: string; icon: LucideIcon; tone: string; subjectLabel: string; subjectHint: string }

export const ANNOUNCEMENT_META: Record<AnnouncementType, Meta> = {
  burial: {
    label: "Burial",
    icon: Cross,
    tone: "bg-foreground/8 text-foreground border-foreground/15",
    subjectLabel: "The deceased",
    subjectHint: "e.g. The late Mzee Yosefu Kato (78)",
  },
  wedding: { label: "Wedding", icon: Heart, tone: "bg-gold/15 text-gold-foreground border-gold/30 dark:text-gold", subjectLabel: "The couple", subjectHint: "e.g. Daniel Ssemanda & Grace Achieng" },
  introduction: { label: "Introduction", icon: Handshake, tone: "bg-chart-5/12 text-chart-5 border-chart-5/25", subjectLabel: "Bride / family", subjectHint: "e.g. Ruth Nalwoga" },
  thanksgiving: { label: "Thanksgiving", icon: HandHeart, tone: "bg-success/10 text-success border-success/20", subjectLabel: "Family / person", subjectHint: "e.g. The Boateng family" },
  fundraising: { label: "Fundraising", icon: HandCoins, tone: "bg-primary/10 text-primary border-primary/20", subjectLabel: "Cause", subjectHint: "e.g. Building fund" },
  meeting: { label: "Meeting", icon: Users, tone: "bg-info/10 text-info border-info/20", subjectLabel: "Who should attend", subjectHint: "e.g. All ministry leaders" },
  general: { label: "General", icon: Megaphone, tone: "bg-muted text-muted-foreground border-transparent", subjectLabel: "Subject", subjectHint: "" },
}

/** "2026-11-08T14:00" → Date (local time, no timezone shift). */
export function parseLocal(value: string) {
  const [d, t = "00:00"] = value.split("T")
  const [y, m, day] = d.split("-").map(Number)
  const [h, min] = t.split(":").map(Number)
  return new Date(y, m - 1, day, h, min)
}
