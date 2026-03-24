import { signOut } from "@/auth"
import { normalizeCallbackPath } from "@/lib/redirects"

function redirectTo(location: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: location
    }
  })
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const callbackUrl = normalizeCallbackPath(request.url, formData.get("callbackUrl")?.toString(), "/")

  await signOut({
    redirect: false,
    redirectTo: callbackUrl
  })

  return redirectTo(callbackUrl)
}
