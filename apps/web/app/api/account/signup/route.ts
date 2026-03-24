import { AuthError } from "next-auth"
import { NextResponse } from "next/server"

import { signIn } from "@/auth"
import { registerUserInKeycloak } from "@/lib/keycloak"
import { normalizeCallbackPath } from "@/lib/redirects"

function buildRedirect(request: Request, location: string) {
  return NextResponse.redirect(new URL(location, request.url), 303)
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")
  const callbackUrl = normalizeCallbackPath(request.url, formData.get("callbackUrl")?.toString(), "/dashboard")

  if (password.length < 8) {
    const redirectUrl = new URL("/signup", request.url)
    redirectUrl.searchParams.set("error", "password_length")
    redirectUrl.searchParams.set("callbackUrl", callbackUrl)
    return NextResponse.redirect(redirectUrl, 303)
  }

  if (password !== confirmPassword) {
    const redirectUrl = new URL("/signup", request.url)
    redirectUrl.searchParams.set("error", "password_mismatch")
    redirectUrl.searchParams.set("callbackUrl", callbackUrl)
    return NextResponse.redirect(redirectUrl, 303)
  }

  const created = await registerUserInKeycloak({ name, email, password })

  if (!created.ok) {
    const redirectUrl = new URL("/signup", request.url)
    redirectUrl.searchParams.set("error", created.reason)
    redirectUrl.searchParams.set("callbackUrl", callbackUrl)
    return NextResponse.redirect(redirectUrl, 303)
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const redirectUrl = new URL("/signin", request.url)
      redirectUrl.searchParams.set("error", "credentials")
      redirectUrl.searchParams.set("callbackUrl", callbackUrl)
      return NextResponse.redirect(redirectUrl, 303)
    }

    throw error
  }

  return buildRedirect(request, callbackUrl)
}
