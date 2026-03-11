import { desc, eq } from "drizzle-orm"
import { hasRole, normalizeRoles } from "@/lib/authz"
import { getPublishedJobsFilter } from "@/lib/job-listing-billing"
import { getSessionSafe } from "@/lib/session"
import { requireApiRoles } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { syncGoogleIndexingForJobTransition } from "@/lib/job-indexing"
import { checkRateLimit } from "@/lib/rate-limit"
import { getRequestKey } from "@/lib/request"
import { getStripe } from "@/lib/stripe"
import { getPublicOrigin } from "@/lib/seo"
import {
  buildCheckoutDescription,
  buildJobWriteValues,
  calculateJobExpiration,
  calculateJobListingPrice,
  jobWriteSchema,
  resolveCompanyForJob,
  toJobSlug
} from "@/lib/job-write"
import { jobs } from "@repo/db/schema/jobs"

export async function GET() {
  const session = await getSessionSafe()
  const roles = normalizeRoles(session?.user?.roles)
  const isAdmin = hasRole(roles, "admin")

  const data = isAdmin
    ? await db.select().from(jobs).orderBy(desc(jobs.createdAt))
    : await db.select().from(jobs).where(getPublishedJobsFilter()).orderBy(desc(jobs.createdAt))

  return Response.json(data)
}

export async function POST(req: Request) {
  const authResult = await requireApiRoles(["business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const isAdmin = hasRole(authResult.user.roles, "admin")

  const rate = checkRateLimit("jobs:create", getRequestKey(req, authResult.user.id), 5, 60 * 60 * 1000)
  if (!rate.ok) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  const parsed = jobWriteSchema.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
  }

  if (parsed.data.website?.trim()) {
    return Response.json({ error: "Spam detected" }, { status: 400 })
  }

  const title = parsed.data.title.trim()
  const listingDurationDays = parsed.data.listingDurationDays
  const baseSlug = toJobSlug(parsed.data.slug ?? title) || "job"
  const slug = parsed.data.slug ? baseSlug : `${baseSlug}-${Date.now().toString(36)}`
  let companyForJob

  try {
    companyForJob = await resolveCompanyForJob(parsed.data, authResult.user.id, isAdmin)
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to resolve company." }, { status: 400 })
  }

  if (!isAdmin && !companyForJob) {
    return Response.json({ error: "Complete business setup before posting a job." }, { status: 400 })
  }

  const now = new Date()
  const jobValues = buildJobWriteValues(parsed.data, companyForJob?.id ?? null)

  if (isAdmin) {
    const [created] = await db
      .insert(jobs)
      .values({
        slug,
        ownerAuthId: authResult.user.id,
        ...jobValues,
        isActive: true,
        listingDurationDays,
        paymentStatus: "paid",
        activatedAt: now,
        expiresAt: calculateJobExpiration(now, listingDurationDays)
      })
      .returning()

    await syncGoogleIndexingForJobTransition({
      before: null,
      after: created
    })

    return Response.json(created, { status: 201 })
  }

  let stripe

  try {
    stripe = getStripe()
  } catch {
    return Response.json({ error: "Stripe billing is not configured yet." }, { status: 503 })
  }

  const [created] = await db
    .insert(jobs)
    .values({
      slug,
      ownerAuthId: authResult.user.id,
      ...jobValues,
      isActive: false,
      listingDurationDays,
      paymentStatus: "pending"
    })
    .returning()

  try {
    const origin = getPublicOrigin(process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(req.url).origin)
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: created.id,
      customer_email: authResult.user.email ?? undefined,
      success_url: `${origin}/post-job/success?jobId=${created.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/post-job?canceled=1&jobId=${created.id}`,
      metadata: {
        jobId: created.id,
        ownerAuthId: authResult.user.id
      },
      line_items: [
        {
          quantity: listingDurationDays,
          price_data: {
            currency: "usd",
            unit_amount: calculateJobListingPrice(1),
            product_data: {
              name: "HireSalem job listing",
              description: buildCheckoutDescription(title, companyForJob?.name ?? null)
            }
          }
        }
      ]
    })

    if (!checkoutSession.url) {
      await db.delete(jobs).where(eq(jobs.id, created.id))
      return Response.json({ error: "Stripe checkout did not return a hosted URL." }, { status: 502 })
    }

    await db
      .update(jobs)
      .set({
        stripeCheckoutSessionId: checkoutSession.id
      })
      .where(eq(jobs.id, created.id))

    return Response.json(
      {
        jobId: created.id,
        checkoutUrl: checkoutSession.url
      },
      { status: 201 }
    )
  } catch {
    await db.delete(jobs).where(eq(jobs.id, created.id))
    return Response.json({ error: "Unable to start Stripe checkout." }, { status: 502 })
  }
}
