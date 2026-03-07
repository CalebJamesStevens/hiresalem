"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { useEffect, useState } from "react"

import { SiteBrand } from "@/components/site-brand"
import { hasRole, normalizeRoles } from "@/lib/authz"
import { MobileNav } from "@/components/mobile-nav"

const publicNavItems = [
  { href: "/", label: "Home" },
  { href: "/jobs", label: "Jobs" },
  { href: "/resources", label: "Resources" }
]

type NavItem = {
  href: string
  label: string
}

type SessionShape = {
  user?: {
    id?: string
    roles?: unknown
  }
}

export function Navbar() {
  const [session, setSession] = useState<SessionShape | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadSession() {
      const response = await fetch("/api/auth/session", {
        cache: "no-store"
      }).catch(() => null)

      if (!response || !response.ok) {
        if (!isCancelled) {
          setSession({})
        }
        return
      }

      const body = (await response.json().catch(() => ({}))) as SessionShape
      if (!isCancelled) {
        setSession(body)
      }
    }

    loadSession()

    return () => {
      isCancelled = true
    }
  }, [])

  const userId = session?.user?.id
  const roles = normalizeRoles(session?.user?.roles)
  const isAdmin = hasRole(roles, "admin")
  const canPost = roles.includes("business") || isAdmin
  const canBecomeBusiness = Boolean(userId) && !canPost
  const secondaryNavItems: NavItem[] = [
    canPost ? { href: "/post-job", label: "Post job" } : null,
    userId ? { href: "/dashboard", label: "Dashboard" } : null,
    canBecomeBusiness ? { href: "/become-business", label: "Become a business" } : null,
    isAdmin ? { href: "/admin/jobs", label: "Admin" } : null
  ].filter((item): item is NavItem => item !== null)

  return (
    <header className="relative z-[90] border-b bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <SiteBrand iconClassName="h-11 w-11" />

        <ul className="hidden items-center gap-4 text-sm md:flex">
          {publicNavItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="text-slate-600 hover:text-slate-900">
                {item.label}
              </Link>
            </li>
          ))}

          {secondaryNavItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="text-slate-600 hover:text-slate-900">
                {item.label}
              </Link>
            </li>
          ))}

          {userId ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  void signOut({ callbackUrl: "/" })
                }}
                className="text-slate-600 hover:text-slate-900"
              >
                Sign out
              </button>
            </li>
          ) : (
            <li>
              <Link href="/signin" className="text-slate-600 hover:text-slate-900">
                Sign in
              </Link>
            </li>
          )}
        </ul>

        <MobileNav primaryItems={publicNavItems} secondaryItems={secondaryNavItems}>
          {userId ? (
            <button
              type="button"
              onClick={() => {
                void signOut({ callbackUrl: "/" })
              }}
              className="min-h-11 text-left text-base font-medium text-slate-900"
            >
              Sign out
            </button>
          ) : (
            <Link href="/signin" className="flex min-h-11 items-center text-base font-medium text-slate-900">
              Sign in
            </Link>
          )}
        </MobileNav>
      </nav>
    </header>
  )
}
