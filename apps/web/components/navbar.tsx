"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { SiteBrand } from "@/components/site-brand"
import { hasRole, normalizeRoles } from "@/lib/authz"
import { getSignOutCallbackUrl } from "@/lib/auth-client"
import { MobileNav } from "@/components/mobile-nav"

const publicNavItems = [
  { href: "/", label: "Home" },
  { href: "/jobs", label: "All Jobs" },
  { href: "/jobs/salem", label: "Salem Jobs" },
  { href: "/employers", label: "Employers" },
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
  const pathname = usePathname()
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
  }, [pathname])

  const userId = session?.user?.id
  const roles = normalizeRoles(session?.user?.roles)
  const isAdmin = hasRole(roles, "admin")
  const canPost = roles.includes("business") || isAdmin
  const canBecomeBusiness = Boolean(userId) && !canPost
  const signOutCallbackUrl = getSignOutCallbackUrl(globalThis.location?.origin)

  const secondaryNavItems: NavItem[] = [
    canPost ? { href: "/post-job", label: "Post job" } : null,
    userId ? { href: "/dashboard", label: "Dashboard" } : null,
    canBecomeBusiness ? { href: "/become-business", label: "Become a business" } : null,
    isAdmin ? { href: "/admin/jobs", label: "Admin" } : null
  ].filter((item): item is NavItem => item !== null)

  return (
    <header className="relative z-[90] border-b bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:py-4">
        <SiteBrand iconClassName="h-9 w-9 md:h-11 md:w-11" labelClassName="text-sm md:text-base" />

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
              <form method="post" action="/api/account/signout">
                <input type="hidden" name="callbackUrl" value={signOutCallbackUrl} />
                <button type="submit" className="text-slate-600 hover:text-slate-900">
                  Sign out
                </button>
              </form>
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
            <form method="post" action="/api/account/signout">
              <input type="hidden" name="callbackUrl" value={signOutCallbackUrl} />
              <button type="submit" className="min-h-11 text-left text-base font-medium text-slate-900">
                Sign out
              </button>
            </form>
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
