"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"

/**
 * Wraps a form submit: collects FormData, tracks pending state, shows a toast on
 * success/failure and keeps Laravel validation errors for <FieldError>.
 */
export function useApiForm(submit: (fd: FormData) => Promise<unknown>, successMessage?: string) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await submit(new FormData(e.currentTarget))
      if (successMessage) toast.success(successMessage)
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError(0, err instanceof Error ? err.message : String(err))
      setError(apiErr)
      // Field errors render inline; only toast when there's nothing to show next to a field.
      if (!Object.keys(apiErr.errors).length) toast.error(apiErr.message)
    } finally {
      setPending(false)
    }
  }

  return { handleSubmit, pending, error, reset: () => setError(null) }
}

export function FieldError({ error, name }: { error: ApiError | null; name: string }) {
  const msg = error?.field(name)
  return msg ? <p className="text-sm text-destructive">{msg}</p> : null
}

/** Trimmed string from FormData, or null when empty. */
export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key)
  if (typeof v !== "string") return null
  const t = v.trim()
  return t === "" ? null : t
}

export function num(fd: FormData, key: string): number | null {
  const v = str(fd, key)
  return v === null ? null : Number(v)
}

/** Radix <Switch name=...> submits "on" when checked and nothing otherwise. */
export const bool = (fd: FormData, key: string) => fd.get(key) === "on"

/** Run an async action with a toast for success/failure (for one-click actions like delete). */
export async function runAction(action: () => Promise<unknown>, successMessage: string) {
  try {
    await action()
    toast.success(successMessage)
    return true
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Something went wrong")
    return false
  }
}
