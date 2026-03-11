import { getPublicOrigin } from "@/lib/seo"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const target = searchParams.get("target") ?? "/"

  if (!target.startsWith("/")) {
    return Response.json({ error: "Invalid target" }, { status: 400 })
  }

  const publicOrigin = getPublicOrigin(process.env.NEXT_PUBLIC_APP_URL)
  const destination = new URL(target, publicOrigin)
  destination.searchParams.set("_gc_event", "email_digest_click")
  const response = NextResponse.redirect(destination)
  response.headers.set("X-Robots-Tag", "noindex, nofollow")
  response.headers.set("Cache-Control", "no-store")
  return response
}
