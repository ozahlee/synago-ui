"use client"

import useSWR, { type SWRConfiguration } from "swr"

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1").replace(/\/$/, "")
const TOKEN_KEY = "synago.token"

/** Full address of a signed photo link from the API (they are relative so they work on any host). */
export const photoSrc = (url: string | null | undefined) => (url ? `${new URL(API_URL).origin}${url}` : null)

export type Paginated<T> = {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null }
}

/** Error thrown for non-2xx responses. `errors` holds Laravel field validation messages (422). */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string[]> = {},
    /** The full JSON error body (e.g. a 409's list of clashes). */
    public body: Record<string, unknown> = {},
  ) {
    super(message)
  }

  /** First validation message for a field, if any. */
  field(name: string): string | undefined {
    return this.errors[name]?.[0]
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable (private mode); session just won't persist */
  }
}

/** Called on any 401 so the auth layer can drop the session. Set by AuthProvider. */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

type Body = Record<string, unknown> | unknown[]

export async function api<T = unknown>(path: string, init: { method?: string; body?: Body } = {}): Promise<T> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    })
  } catch {
    throw new ApiError(0, `Cannot reach the server at ${API_URL}. Is the backend running?`)
  }

  if (res.status === 204) return undefined as T

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.()
    throw new ApiError(res.status, json.message ?? `Request failed (${res.status})`, json.errors, json)
  }
  return json as T
}

/** Upload a file (multipart). */
export async function upload<T>(path: string, form: FormData): Promise<T> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { method: "POST", headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: form })
  } catch {
    throw new ApiError(0, `Cannot reach the server at ${API_URL}. Is the backend running?`)
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.()
    throw new ApiError(res.status, json.message ?? `Upload failed (${res.status})`, json.errors, json)
  }
  return json as T
}

/** Fetch a protected file and open it (PDF/images in a new tab) or save it (others). */
export async function openFile(path: string, name: string, inline: boolean) {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new ApiError(res.status, res.status === 404 ? "That file is no longer available." : `Download failed (${res.status})`)
  const url = URL.createObjectURL(await res.blob())
  if (inline) {
    window.open(url, "_blank", "noopener")
  } else {
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export const post = <T>(path: string, body?: Body) => api<T>(path, { method: "POST", body: body ?? {} })
export const patch = <T>(path: string, body: Body) => api<T>(path, { method: "PATCH", body })
export const put = <T>(path: string, body: Body) => api<T>(path, { method: "PUT", body })
export const del = (path: string) => api<void>(path, { method: "DELETE" })

/** Build "/path?x=1&y=2", dropping empty / "all" values. */
export function qs(path: string, params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || v === "all") continue
    search.set(k, String(v))
  }
  const s = search.toString()
  return s ? `${path}?${s}` : path
}

/** SWR hook that unwraps the `{data}` envelope. Pass null to skip fetching. */
export function useApi<T>(path: string | null, config?: SWRConfiguration) {
  const swr = useSWR<{ data: T }, ApiError>(path, (p: string) => api<{ data: T }>(p), config)
  return { ...swr, data: swr.data?.data }
}

/** SWR hook for paginated endpoints: returns rows plus pagination meta. */
export function usePaginated<T>(path: string | null) {
  const swr = useSWR<Paginated<T>, ApiError>(path, (p: string) => api<Paginated<T>>(p), { keepPreviousData: true })
  return { ...swr, rows: swr.data?.data ?? [], meta: swr.data?.meta }
}
