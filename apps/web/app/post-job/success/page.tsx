import Link from "next/link"

import { hasRole } from "@/lib/authz"
import { activatePaidJobListing } from "@/lib/job-billing"
import { getJobById } from "@/lib/jobs"
import { requirePageRoles } from "@/lib/page-auth"
import { getStripe } from "@/lib/stripe"

type PostJobSuccessPageProps = {
  searchParams: Promise<{
    jobId?: string
    session_id?: string
  }>
}

export default async function PostJobSuccessPage({ searchParams }: PostJobSuccessPageProps) {
  const params = await searchParams
  const user = await requirePageRoles(["business", "admin"], "/post-job/success")
  const isAdmin = hasRole(user.roles, "admin")

  if (!params.jobId || !params.session_id) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Payment status unavailable</h1>
        <p className="text-slate-600">We could not verify this listing payment. Check your dashboard for the latest status.</p>
        <Link href="/dashboard/jobs" className="inline-flex rounded bg-slate-900 px-4 py-2 text-white">
          Go to dashboard
        </Link>
      </section>
    )
  }

  const job = await getJobById(params.jobId)

  if (!job || (!isAdmin && job.ownerAuthId !== user.id)) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Listing not found</h1>
        <p className="text-slate-600">We could not find a job listing for this payment session.</p>
        <Link href="/dashboard/jobs" className="inline-flex rounded bg-slate-900 px-4 py-2 text-white">
          Go to dashboard
        </Link>
      </section>
    )
  }

  let headline = "Payment processing"
  let message = "Stripe has the checkout session, but payment has not been finalized yet."

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(params.session_id)

    if (session.client_reference_id === job.id && session.payment_status === "paid") {
      await activatePaidJobListing({
        jobId: job.id,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null
      })

      headline = "Job published"
      message = "Payment succeeded and your listing is now live."
    } else if (session.status === "open") {
      message = "Stripe still shows this checkout as open. Your listing will remain hidden until payment succeeds."
    } else {
      message = "We found the checkout session, but Stripe has not marked it paid yet."
    }
  } catch {
    message = "We could not verify the Stripe session right now. If you were charged, the webhook should still publish the listing shortly."
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">{headline}</h1>
      <p className="text-slate-600">{message}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/jobs" className="inline-flex rounded bg-slate-900 px-4 py-2 text-white">
          View jobs dashboard
        </Link>
        <Link href={`/jobs/${job.slug}`} className="inline-flex rounded border px-4 py-2">
          View listing
        </Link>
      </div>
    </section>
  )
}
