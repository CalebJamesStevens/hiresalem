import { AuthError } from "next-auth"
import { signIn } from "@/auth"
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
      return redirectTo(`/signin?error=credentials&callbackUrl=${encodeURIComponent(callbackUrl)}`)
    }

    throw error
  }

  return redirectTo(callbackUrl)
}
