import { NextResponse } from "next/server"

import { signOut } from "@/auth"
import { normalizeCallbackPath } from "@/lib/redirects"

function buildRedirect(request: Request, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), 303)
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const callbackUrl = normalizeCallbackPath(request.url, formData.get("callbackUrl")?.toString(), "/")

  await signOut({
    redirect: false,
    redirectTo: callbackUrl
  })

  return buildRedirect(request, callbackUrl)
}
