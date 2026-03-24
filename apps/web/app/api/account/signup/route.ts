import { AuthError } from "next-auth"
import { signIn } from "@/auth"
import { registerUserInKeycloak } from "@/lib/keycloak"
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
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")
  const callbackUrl = normalizeCallbackPath(request.url, formData.get("callbackUrl")?.toString(), "/dashboard")

  if (password.length < 8) {
    return redirectTo(`/signup?error=password_length&callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  if (password !== confirmPassword) {
    return redirectTo(`/signup?error=password_mismatch&callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  const created = await registerUserInKeycloak({ name, email, password })

  if (!created.ok) {
    return redirectTo(`/signup?error=${encodeURIComponent(created.reason)}&callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

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
