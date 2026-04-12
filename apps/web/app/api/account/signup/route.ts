import { AuthError } from "next-auth"
import { signIn } from "@/auth"
import { registerUserInKeycloak } from "@/lib/keycloak"
import { checkRateLimit } from "@/lib/rate-limit"
import { normalizeCallbackPath } from "@/lib/redirects"
import { getRequestKey } from "@/lib/request"

const SIGNUP_IP_LIMIT = 5
const SIGNUP_IP_WINDOW_MS = 10 * 60 * 1000
const SIGNUP_EMAIL_LIMIT = 3
const SIGNUP_EMAIL_WINDOW_MS = 60 * 60 * 1000
const SIGNUP_HONEYPOT_FIELD = "signupFaxNumber"

function redirectTo(location: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: location
    }
  })
}

function redirectToSignupError(callbackUrl: string, error: string) {
  return redirectTo(`/signup?error=${encodeURIComponent(error)}&callbackUrl=${encodeURIComponent(callbackUrl)}`)
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")
  const honeypotValue = String(formData.get(SIGNUP_HONEYPOT_FIELD) ?? "").trim()
  const callbackUrl = normalizeCallbackPath(request.url, formData.get("callbackUrl")?.toString(), "/dashboard")

  const requestKey = getRequestKey(request)
  const ipRate = checkRateLimit("account:signup:ip", requestKey, SIGNUP_IP_LIMIT, SIGNUP_IP_WINDOW_MS)
  if (!ipRate.ok) {
    return redirectToSignupError(callbackUrl, "try_again_later")
  }

  const emailRate = checkRateLimit("account:signup:email", email, SIGNUP_EMAIL_LIMIT, SIGNUP_EMAIL_WINDOW_MS)
  if (!emailRate.ok) {
    return redirectToSignupError(callbackUrl, "try_again_later")
  }

  if (honeypotValue) {
    return redirectToSignupError(callbackUrl, "try_again_later")
  }

  if (password.length < 8) {
    return redirectToSignupError(callbackUrl, "password_length")
  }

  if (password !== confirmPassword) {
    return redirectToSignupError(callbackUrl, "password_mismatch")
  }

  const created = await registerUserInKeycloak({ name, email, password })

  if (!created.ok) {
    return redirectToSignupError(callbackUrl, created.reason)
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
