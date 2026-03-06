import Link from "next/link"

import { signOut } from "@/auth"
import { getSessionSafe } from "@/lib/session"
import { hasRole, normalizeRoles } from "@/lib/authz"

const publicNavItems = [
  { href: "/", label: "Home" },
  { href: "/jobs", label: "Jobs" }
]

export async function Navbar() {
  const session = await getSessionSafe()
  const userId = session?.user?.id
  const roles = normalizeRoles(session?.user?.roles)
  const isAdmin = hasRole(roles, "admin")
  const canPost = roles.includes("business") || isAdmin
  const canBecomeBusiness = Boolean(userId) && !canPost

  return (
    <header className="border-b bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-semibold">
          HireSalem
        </Link>

        <ul className="flex items-center gap-4 text-sm">
          {publicNavItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="text-slate-600 hover:text-slate-900">
                {item.label}
              </Link>
            </li>
          ))}

          {canPost ? (
            <li>
              <Link href="/post-job" className="text-slate-600 hover:text-slate-900">
                Post Job
              </Link>
            </li>
          ) : null}

          {userId ? (
            <li>
              <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
                Dashboard
              </Link>
            </li>
          ) : null}

          {canBecomeBusiness ? (
            <li>
              <Link href="/become-business" className="text-slate-600 hover:text-slate-900">
                Become a business
              </Link>
            </li>
          ) : null}

          {isAdmin ? (
            <li>
              <Link href="/admin/jobs" className="text-slate-600 hover:text-slate-900">
                Admin
              </Link>
            </li>
          ) : null}

          {userId ? (
            <li>
              <form
                action={async () => {
                  "use server"
                  await signOut({ redirectTo: "/" })
                }}
              >
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
      </nav>
    </header>
  )
}
