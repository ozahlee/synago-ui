"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { api, getToken, post, setToken, setUnauthorizedHandler } from "@/lib/api"
import type { User } from "@/lib/types"

type AuthState = {
  user: User | null
  /** True until the stored token has been checked against /auth/me. */
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  /** Create a new church and its first admin, then sign in. */
  signup: (data: SignupData) => Promise<User>
  /** Reload the signed-in user (e.g. after finishing set-up or confirming the email). */
  refresh: () => Promise<void>
  logout: () => Promise<void>
  /** "a|b" means either permission. */
  can: (permission: string) => boolean
  /** Replace the signed-in user (after editing your own profile). */
  setUser: (user: User) => void
}

export type SignupData = {
  churchName: string
  denomination: string
  name: string
  email: string
  phone: string
  password: string
  password_confirmation: string
  acceptTerms: boolean
}

/** Where a user belongs after signing in: the platform console, the welcome set-up, or the app. */
export function homeFor(user: User, next?: string | null) {
  if (user.platformAdmin) return "/platform"
  if (user.church && !user.church.onboarded && user.permissions.includes("settings.manage")) return "/welcome"
  return next && next.startsWith("/") && next !== "/login" ? next : "/"
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  /**
   * End the session with a full page load to /login. A hard reload (rather than clearing the
   * SWR cache in place) guarantees no data or in-flight/deduped requests from the previous
   * session survive — important on shared church-office computers.
   */
  const clear = useCallback((returnTo?: string) => {
    setToken(null)
    const next = returnTo && returnTo !== "/login" ? `?next=${encodeURIComponent(returnTo)}` : ""
    window.location.assign(`/login${next}`)
  }, [])

  useEffect(() => {
    // Token expired/revoked mid-session: bounce to login, then come back here.
    setUnauthorizedHandler(() => clear(window.location.pathname))
    if (!getToken()) {
      setLoading(false)
      return
    }
    api<{ data: User }>("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
    return () => setUnauthorizedHandler(null)
  }, [clear])

  const login = useCallback(async (email: string, password: string) => {
    const res = await post<{ token: string; user: User }>("/auth/login", { email, password, deviceName: "web" })
    setToken(res.token)
    setUser(res.user)
    return res.user
  }, [])

  const signup = useCallback(async (data: SignupData) => {
    const res = await post<{ token: string; user: User }>("/auth/register", data)
    setToken(res.token)
    setUser(res.user)
    return res.user
  }, [])

  const refresh = useCallback(async () => {
    const r = await api<{ data: User }>("/auth/me")
    setUser(r.data)
  }, [])

  const logout = useCallback(async () => {
    try {
      await post("/auth/logout")
    } finally {
      clear()
    }
  }, [clear])

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, signup, refresh, logout, can: (p) => p.split("|").some((x) => !!user?.permissions.includes(x)), setUser }),
    [user, loading, login, signup, refresh, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
