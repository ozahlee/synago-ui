"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

/**
 * Run `apply` whenever ?key= is present (on load, or when the search palette links here again).
 * Lets the global search deep-link into a page: ?open=ID, ?q=text, ?tab=name.
 */
export function useUrlParam(key: string, apply: (value: string) => void) {
  const value = useSearchParams().get(key)
  useEffect(() => {
    if (value) apply(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
}
