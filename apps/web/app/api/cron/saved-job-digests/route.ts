import { runSavedJobDigests } from "@/lib/saved-job-digests"

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    throw new Error("CRON_SECRET is not configured")
  }

  const { searchParams } = new URL(request.url)
  const headerSecret = request.headers.get("x-cron-secret")
  return headerSecret === secret || searchParams.get("secret") === secret
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const summary = await runSavedJobDigests()
    return Response.json(summary)
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to run saved-job digests" }, { status: 500 })
  }
}

export const GET = POST
