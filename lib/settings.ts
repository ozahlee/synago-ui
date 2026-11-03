"use client"

import { useApi } from "@/lib/api"
import { CHURCH_NAME } from "@/lib/format"
import type { ChurchSettings, Denomination, RiteKind } from "@/lib/types"

export const DEFAULT_SETTINGS: ChurchSettings = {
  churchName: CHURCH_NAME,
  denomination: "anglican",
  diocese: null,
  address: null,
  pledgePrefix: CHURCH_NAME,
  services: ["First Service", "Second Service"],
  sacramentRequirements: [],
}

/** Church-wide settings from GET /settings (falls back to defaults while loading). */
export function useSettings(): ChurchSettings {
  const { data } = useApi<ChurchSettings>("/settings", { revalidateOnFocus: false })
  return data ?? DEFAULT_SETTINGS
}

type Rite = { kind: RiteKind; label: string; plural: string; verb: string; certificate: string }

const RITES: Record<RiteKind, Rite> = {
  baptism: { kind: "baptism", label: "Baptism", plural: "Baptisms", verb: "Baptised", certificate: "Certificate of Baptism" },
  confirmation: { kind: "confirmation", label: "Confirmation", plural: "Confirmations", verb: "Confirmed", certificate: "Certificate of Confirmation" },
  dedication: { kind: "dedication", label: "Child dedication", plural: "Dedications", verb: "Dedicated", certificate: "Certificate of Dedication" },
}

/** Which rites a church records, in its own words. Anglican: baptism + confirmation; Pentecostal: water baptism + child dedication. */
export function ritesFor(denomination: Denomination): Rite[] {
  if (denomination === "anglican") return [RITES.baptism, RITES.confirmation]
  if (denomination === "pentecostal") return [{ ...RITES.baptism, label: "Water baptism" }, RITES.dedication]
  return [RITES.baptism, RITES.confirmation, RITES.dedication]
}

export const rite = (kind: RiteKind, denomination: Denomination): Rite =>
  ritesFor(denomination).find((r) => r.kind === kind) ?? RITES[kind]

export const defaultMode = (denomination: Denomination) => (denomination === "pentecostal" ? "immersion" : "sprinkling")
