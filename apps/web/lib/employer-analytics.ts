import { and, desc, eq, gte } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db"
import { companies } from "@repo/db/schema/companies"
import { engagementEvents, engagementEventTypeEnum } from "@repo/db/schema/engagement-events"
import { jobs } from "@repo/db/schema/jobs"

type EngagementEventType = (typeof engagementEventTypeEnum.enumValues)[number]

const employerAnalyticsEventSchema = z
  .object({
    companyId: z.string().uuid(),
    jobId: z.string().uuid().optional(),
    eventType: z.enum(engagementEventTypeEnum.enumValues),
    sessionKey: z.string().trim().max(120).optional()
  })
  .superRefine((value, ctx) => {
    if (value.eventType === "company_view" && value.jobId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["jobId"],
        message: "company_view cannot include a jobId"
      })
    }

    if (value.eventType !== "company_view" && !value.jobId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["jobId"],
        message: "jobId is required for job events"
      })
    }
  })

export function parseEmployerAnalyticsEvent(input: unknown) {
  return employerAnalyticsEventSchema.safeParse(input)
}

export async function recordEmployerAnalyticsEvent(input: {
  companyId: string
  jobId?: string
  eventType: EngagementEventType
  sessionKey?: string | null
}) {
  const [created] = await db
    .insert(engagementEvents)
    .values({
      companyId: input.companyId,
      jobId: input.jobId ?? null,
      eventType: input.eventType,
      sessionKey: input.sessionKey?.trim() || null
    })
    .returning()

  return created
}

export async function validateEmployerAnalyticsTarget(input: { companyId: string; jobId?: string; eventType: EngagementEventType }) {
  const [company] = await db.select({ id: companies.id }).from(companies).where(eq(companies.id, input.companyId)).limit(1)
  if (!company) {
    return false
  }

  if (input.eventType === "company_view") {
    return true
  }

  if (!input.jobId) {
    return false
  }

  const [job] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, input.jobId), eq(jobs.companyId, input.companyId)))
    .limit(1)

  return Boolean(job)
}

function getStartOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function formatDayKey(date: Date) {
  return getStartOfDay(date).toISOString().slice(0, 10)
}

function buildEmptySeries(days: number, referenceDate: Date) {
  const series = []
  const end = getStartOfDay(referenceDate)

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(end)
    date.setDate(end.getDate() - offset)
    series.push({
      day: formatDayKey(date),
      jobViews: 0,
      applyClicks: 0,
      companyViews: 0
    })
  }

  return series
}

export async function getEmployerAnalyticsSnapshot(companyId: string, referenceDate = new Date()) {
  const start30 = getStartOfDay(referenceDate)
  start30.setDate(start30.getDate() - 29)

  const start7 = new Date(start30)
  start7.setDate(getStartOfDay(referenceDate).getDate() - 6)

  const events = await db
    .select({
      id: engagementEvents.id,
      jobId: engagementEvents.jobId,
      eventType: engagementEvents.eventType,
      occurredAt: engagementEvents.occurredAt,
      jobSlug: jobs.slug,
      jobTitle: jobs.title
    })
    .from(engagementEvents)
    .leftJoin(jobs, eq(engagementEvents.jobId, jobs.id))
    .where(and(eq(engagementEvents.companyId, companyId), gte(engagementEvents.occurredAt, start30)))
    .orderBy(desc(engagementEvents.occurredAt))

  const series = buildEmptySeries(30, referenceDate)
  const seriesByDay = new Map(series.map((row) => [row.day, row]))
  const byJob = new Map<string, { jobId: string; jobSlug: string | null; jobTitle: string | null; jobViews: number; applyClicks: number }>()
  const totals7 = {
    jobViews: 0,
    applyClicks: 0,
    companyViews: 0
  }
  const totals30 = {
    jobViews: 0,
    applyClicks: 0,
    companyViews: 0
  }

  for (const event of events) {
    const dayKey = formatDayKey(event.occurredAt)
    const day = seriesByDay.get(dayKey)
    const counts7 = event.occurredAt >= start7

    if (event.eventType === "job_view") {
      totals30.jobViews += 1
      if (counts7) {
        totals7.jobViews += 1
      }
      if (day) {
        day.jobViews += 1
      }
    }

    if (event.eventType === "apply_click") {
      totals30.applyClicks += 1
      if (counts7) {
        totals7.applyClicks += 1
      }
      if (day) {
        day.applyClicks += 1
      }
    }

    if (event.eventType === "company_view") {
      totals30.companyViews += 1
      if (counts7) {
        totals7.companyViews += 1
      }
      if (day) {
        day.companyViews += 1
      }
    }

    if (event.jobId) {
      const existing = byJob.get(event.jobId) ?? {
        jobId: event.jobId,
        jobSlug: event.jobSlug,
        jobTitle: event.jobTitle,
        jobViews: 0,
        applyClicks: 0
      }

      if (event.eventType === "job_view") {
        existing.jobViews += 1
      }

      if (event.eventType === "apply_click") {
        existing.applyClicks += 1
      }

      byJob.set(event.jobId, existing)
    }
  }

  return {
    totals7,
    totals30,
    dailySeries: series,
    jobs: Array.from(byJob.values()).sort((left, right) => right.jobViews + right.applyClicks - (left.jobViews + left.applyClicks))
  }
}
