import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const target = searchParams.get("target") ?? "/"

  if (!target.startsWith("/")) {
    return Response.json({ error: "Invalid target" }, { status: 400 })
  }

  const destination = new URL(target, request.url)
  destination.searchParams.set("_gc_event", "email_digest_click")
  return NextResponse.redirect(new URL(`${destination.pathname}${destination.search}${destination.hash}`, request.url))
}
