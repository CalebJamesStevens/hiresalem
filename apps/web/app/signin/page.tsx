import Link from "next/link"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

import { signIn } from "@/auth"

type SignInPageProps = {
  searchParams: Promise<{
    callbackUrl?: string
    error?: string
  }>
}

function errorMessage(error: string | undefined) {
  if (!error) {
    return null
  }

  if (error === "credentials") {
    return "Invalid email or password."
  }

  return "Unable to sign in. Please try again."
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams
  const callbackUrl = params.callbackUrl ?? "/dashboard"
  const message = errorMessage(params.error)

  return (
    <section className="mx-auto max-w-md space-y-6 rounded-lg border bg-white p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-sm text-slate-600">Access your HireSalem account.</p>
      </div>

      {message ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}

      <form
        action={async (formData) => {
          "use server"

          const email = String(formData.get("email") ?? "").trim().toLowerCase()
          const password = String(formData.get("password") ?? "")
          const redirectTo = String(formData.get("callbackUrl") ?? "/dashboard")

          try {
            await signIn("credentials", {
              email,
              password,
              redirectTo
            })
          } catch (error) {
            if (error instanceof AuthError) {
              const encodedCallback = encodeURIComponent(redirectTo)
              redirect(`/signin?error=credentials&callbackUrl=${encodedCallback}`)
            }

            throw error
          }
        }}
        className="space-y-4"
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

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
          <input id="password" name="password" type="password" required className="w-full rounded border px-3 py-2" />
        </div>

        <button type="submit" className="w-full rounded bg-slate-900 px-4 py-2 text-white">
          Sign in
        </button>
      </form>

      <p className="text-sm text-slate-600">
        New here?{" "}
        <Link href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="underline">
          Create an account
        </Link>
      </p>
    </section>
  )
}
