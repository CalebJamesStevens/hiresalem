import { AuthError } from "next-auth"
import { NextResponse } from "next/server"

import { signIn } from "@/auth"
import { normalizeCallbackPath } from "@/lib/redirects"

function buildRedirect(request: Request, location: string) {
  return NextResponse.redirect(new URL(location, request.url), 303)
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const callbackUrl = normalizeCallbackPath(request.url, formData.get("callbackUrl")?.toString(), "/dashboard")

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
