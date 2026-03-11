import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { hasAnyRole, normalizeRoles } from "@/lib/authz"
import { getCanonicalRedirectUrl } from "@/lib/seo"

function signInRedirect(req: Request) {
  const url = new URL(req.url)
  const signInUrl = new URL("/signin", req.url)
  signInUrl.searchParams.set("callbackUrl", `${url.pathname}${url.search}`)

  return NextResponse.redirect(signInUrl)
}

export default auth((req: any) => {
  const canonicalRedirectUrl = getCanonicalRedirectUrl({
    url: req.url,
    forwardedProto: req.headers.get("x-forwarded-proto")
  })

  if (canonicalRedirectUrl) {
    return NextResponse.redirect(canonicalRedirectUrl, 308)
  }

  const pathname = req.nextUrl.pathname
  const userId = req.auth?.user?.id
  const roles = normalizeRoles(req.auth?.user?.roles)

  if (pathname.startsWith("/post-job")) {
    if (!userId) {
      return signInRedirect(req)
    }

    if (!hasAnyRole(roles, ["business", "admin"])) {
      return NextResponse.redirect(new URL("/jobs", req.url))
    }
  }

  if (pathname.startsWith("/dashboard/jobs")) {
    if (!userId) {
      return signInRedirect(req)
    }

    if (!hasAnyRole(roles, ["business", "admin"])) {
      return NextResponse.redirect(new URL("/jobs", req.url))
    }
  }

  if (pathname.startsWith("/dashboard/applicants")) {
    if (!userId) {
      return signInRedirect(req)
    }

    if (!hasAnyRole(roles, ["business", "admin"])) {
      return NextResponse.redirect(new URL("/jobs", req.url))
    }
  }

  if (pathname.startsWith("/dashboard/applications")) {
    if (!userId) {
      return signInRedirect(req)
    }

    if (!hasAnyRole(roles, ["user", "admin"])) {
      return NextResponse.redirect(new URL("/jobs", req.url))
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!userId) {
      return signInRedirect(req)
    }

    if (!hasAnyRole(roles, ["admin"])) {
      return NextResponse.redirect(new URL("/jobs", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/webpack-hmr).*)"]
}
