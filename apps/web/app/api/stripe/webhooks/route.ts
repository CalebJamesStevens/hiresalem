import { syncCompanyBillingFromCheckoutSession, syncCompanyBillingFromStripeSubscription } from "@/lib/company-billing"
import { markEmployerAddOnCanceledBySessionId, syncEmployerAddOnFromCheckoutSession } from "@/lib/employer-add-ons"
import { activatePaidJobListing, markJobPaymentCanceledBySessionId } from "@/lib/job-billing"
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return Response.json({ error: "Missing Stripe signature" }, { status: 400 })
  }

  let stripe
  let webhookSecret

  try {
    stripe = getStripe()
    webhookSecret = getStripeWebhookSecret()
  } catch {
    return Response.json({ error: "Stripe webhook is not configured" }, { status: 503 })
  }

  const payload = await req.text()

  let event

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch {
    return Response.json({ error: "Invalid Stripe signature" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object
    const isEmployerAddOnCheckout = typeof session.metadata?.addOnType === "string"
    const jobId = !isEmployerAddOnCheckout && (typeof session.client_reference_id === "string" ? session.client_reference_id : session.metadata?.jobId)

    if (jobId) {
      await activatePaidJobListing({
        jobId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null
      })
    }

    if (session.mode === "subscription") {
      await syncCompanyBillingFromCheckoutSession(session, stripe)
    }

    if (session.mode === "payment") {
      await syncEmployerAddOnFromCheckoutSession(session)
    }
  }

  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object
    await markJobPaymentCanceledBySessionId(session.id)
    await markEmployerAddOnCanceledBySessionId(session.id)
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    await syncCompanyBillingFromStripeSubscription(event.data.object)
  }

  return Response.json({ received: true })
}
