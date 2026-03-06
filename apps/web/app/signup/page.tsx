import Link from "next/link"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

import { signIn } from "@/auth"
import { registerUserInKeycloak } from "@/lib/keycloak"

type SignUpPageProps = {
  searchParams: Promise<{
    callbackUrl?: string
    error?: string
  }>
}

function errorMessage(error: string | undefined) {
  if (!error) {
    return null
  }

  if (error === "password_mismatch") {
    return "Passwords do not match."
  }

  if (error === "password_length") {
    return "Password must be at least 8 characters."
  }

  if (error === "email_exists") {
    return "An account with that email already exists."
  }

  if (error === "admin_config_missing") {
    return "Signup is not configured yet. Ask support to configure Keycloak admin credentials."
  }

  if (error === "admin_unreachable") {
    return "Signup is temporarily unavailable. Cannot reach authentication service."
  }

  if (error === "realm_not_found") {
    return "Signup is not configured correctly. AUTH_KEYCLOAK_ISSUER points to a realm that does not exist."
  }

  if (error === "admin_auth_failed") {
    return "Signup is temporarily unavailable. Keycloak admin token request failed."
  }

  if (error === "service_account_disabled") {
    return "Signup requires Service Accounts enabled on your Keycloak client."
  }

  if (error === "admin_forbidden") {
    return "Signup is blocked: Keycloak client lacks permission to create users."
  }

  if (error === "role_missing") {
    return "Signup is temporarily unavailable. The Keycloak realm is missing the configured default role."
  }

  return "Unable to create account. Please try again."
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams
  const callbackUrl = params.callbackUrl ?? "/dashboard"
  const message = errorMessage(params.error)

  return (
    <section className="mx-auto max-w-md space-y-6 rounded-lg border bg-white p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="text-sm text-slate-600">Sign up to apply for jobs and manage your account.</p>
      </div>

      {message ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}

      <form
        action={async (formData) => {
          "use server"

          const name = String(formData.get("name") ?? "").trim()
          const email = String(formData.get("email") ?? "").trim().toLowerCase()
          const password = String(formData.get("password") ?? "")
          const confirmPassword = String(formData.get("confirmPassword") ?? "")
          const redirectTo = String(formData.get("callbackUrl") ?? "/dashboard")

          const encodedCallback = encodeURIComponent(redirectTo)

          if (password.length < 8) {
            redirect(`/signup?error=password_length&callbackUrl=${encodedCallback}`)
          }

          if (password !== confirmPassword) {
            redirect(`/signup?error=password_mismatch&callbackUrl=${encodedCallback}`)
          }

          const created = await registerUserInKeycloak({ name, email, password })

          if (!created.ok) {
            redirect(`/signup?error=${created.reason}&callbackUrl=${encodedCallback}`)
          }

          try {
            await signIn("credentials", {
              email,
              password,
              redirectTo
            })
          } catch (error) {
            if (error instanceof AuthError) {
              redirect(`/signin?error=credentials&callbackUrl=${encodedCallback}`)
            }

            throw error
          }
        }}
        className="space-y-4"
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Full name
          </label>
          <input id="name" name="name" required className="w-full rounded border px-3 py-2" />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input id="email" name="email" type="email" required className="w-full rounded border px-3 py-2" />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input id="password" name="password" type="password" minLength={8} required className="w-full rounded border px-3 py-2" />
        </div>

        <div className="space-y-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            minLength={8}
            required
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <button type="submit" className="w-full rounded bg-slate-900 px-4 py-2 text-white">
          Create account
        </button>
      </form>

      <p className="text-sm text-slate-600">
        Already have an account?{" "}
        <Link href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="underline">
          Sign in
        </Link>
      </p>
    </section>
  )
}
