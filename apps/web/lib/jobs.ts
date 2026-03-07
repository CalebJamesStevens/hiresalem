import { and, asc, desc, eq, ilike, sql, type SQL } from "drizzle-orm"

import { db } from "@/lib/db"
import type { JobsSearchParams } from "@/lib/job-search"
import { JOBS_PAGE_SIZE, parseJobsSearchParams } from "@/lib/job-search"
import { getPublishedJobsFilter } from "@/lib/job-listing-billing"
import { companies } from "@repo/db/schema/companies"
import { jobs } from "@repo/db/schema/jobs"

export type Job = typeof jobs.$inferSelect
type PublicJobFields = Pick<
  Job,
  | "id"
  | "slug"
  | "title"
  | "ownerAuthId"
  | "companyId"
  | "location"
  | "salary"
  | "workMode"
  | "employmentType"
  | "category"
  | "salaryMin"
  | "salaryMax"
  | "salaryCurrency"
  | "salaryInterval"
  | "description"
  | "applyType"
  | "applyUrl"
  | "isActive"
  | "listingDurationDays"
  | "paymentStatus"
  | "activatedAt"
  | "expiresAt"
  | "createdAt"
>

export type PublicJobSearchResult = PublicJobFields & {
  companyName: string | null
  companySlug: string | null
  companyWebsite: string | null
}

export type PublicJobDetail = PublicJobSearchResult

export type TopEmployer = {
  id: string
  slug: string
  name: string
  website: string | null
  activeJobCount: number
}

export type PublicJobSearchResponse = {
  results: PublicJobSearchResult[]
  total: number
  page: number
  pageSize: number
  appliedFilters: JobsSearchParams
}

function getSearchVector() {
  return sql`
    setweight(to_tsvector('english', coalesce(${jobs.title}, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(${companies.name}, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(${jobs.location}, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(${jobs.description}, '')), 'C')
  `
}

function getSalarySortValue() {
  return sql<number>`coalesce(${jobs.salaryMin}, ${jobs.salaryMax})`
}

function getSalaryKnownOrder() {
  return sql<number>`case when ${jobs.salaryMin} is null and ${jobs.salaryMax} is null then 1 else 0 end`
}

function buildPublicJobFilters(params: JobsSearchParams) {
  const filters: SQL[] = [getPublishedJobsFilter()]
  const searchVector = getSearchVector()
  const searchTerm = params.q ? `%${params.q}%` : null
  const tsQuery = params.q ? sql`websearch_to_tsquery('english', ${params.q})` : null
  const keywordFilter =
    params.q && searchTerm && tsQuery
      ? sql`(
          ${searchVector} @@ ${tsQuery}
          or ${jobs.title} ilike ${searchTerm}
          or ${companies.name} ilike ${searchTerm}
          or ${jobs.description} ilike ${searchTerm}
          or ${jobs.location} ilike ${searchTerm}
        )`
      : null

  if (keywordFilter) {
    filters.push(keywordFilter)
  }

  if (params.location) {
    filters.push(ilike(jobs.location, `%${params.location}%`))
  }

  if (params.workMode !== "any") {
    filters.push(eq(jobs.workMode, params.workMode))
  }

  if (params.employmentType !== "any") {
    filters.push(eq(jobs.employmentType, params.employmentType))
  }

  if (params.category !== "any") {
    filters.push(eq(jobs.category, params.category))
  }

  if (params.applyType !== "any") {
    filters.push(eq(jobs.applyType, params.applyType))
  }

  if (params.postedWithin !== "any") {
    const cutoff = new Date(Date.now() - Number.parseInt(params.postedWithin, 10) * 24 * 60 * 60 * 1000)
    filters.push(sql`${jobs.createdAt} >= ${cutoff}`)
  }

  if (params.minSalary) {
    filters.push(sql`coalesce(${jobs.salaryMax}, ${jobs.salaryMin}) >= ${params.minSalary}`)
  }

  return {
    filters,
    searchVector,
    searchTerm,
    tsQuery
  }
}

function getPublicJobSelectShape(relevance: SQL<number>) {
  return {
    id: jobs.id,
    slug: jobs.slug,
    title: jobs.title,
    ownerAuthId: jobs.ownerAuthId,
    companyId: jobs.companyId,
    location: jobs.location,
    salary: jobs.salary,
    workMode: jobs.workMode,
    employmentType: jobs.employmentType,
    category: jobs.category,
    salaryMin: jobs.salaryMin,
    salaryMax: jobs.salaryMax,
    salaryCurrency: jobs.salaryCurrency,
    salaryInterval: jobs.salaryInterval,
    description: jobs.description,
    applyType: jobs.applyType,
    applyUrl: jobs.applyUrl,
    isActive: jobs.isActive,
    listingDurationDays: jobs.listingDurationDays,
    paymentStatus: jobs.paymentStatus,
    activatedAt: jobs.activatedAt,
    expiresAt: jobs.expiresAt,
    createdAt: jobs.createdAt,
    companyName: companies.name,
    companySlug: companies.slug,
    companyWebsite: companies.website,
    relevance
  }
}

export async function searchPublicJobs(input: JobsSearchParams): Promise<PublicJobSearchResponse> {
  const params = input
  const { filters, searchVector, searchTerm, tsQuery } = buildPublicJobFilters(params)

  const relevance =
    params.q && searchTerm && tsQuery
      ? sql<number>`
          (case when ${searchVector} @@ ${tsQuery} then ts_rank_cd(${searchVector}, ${tsQuery}) else 0 end) +
          (case when ${jobs.title} ilike ${searchTerm} then 0.6 else 0 end) +
          (case when ${companies.name} ilike ${searchTerm} then 0.5 else 0 end) +
          (case when ${jobs.location} ilike ${searchTerm} then 0.2 else 0 end) +
          (case when ${jobs.description} ilike ${searchTerm} then 0.15 else 0 end)
        `
      : sql<number>`0`

  const where = and(...filters)

  const orderBy =
    params.sort === "oldest"
      ? [asc(jobs.createdAt)]
      : params.sort === "salary_high_to_low"
        ? [asc(getSalaryKnownOrder()), desc(getSalarySortValue()), desc(jobs.createdAt)]
        : params.sort === "salary_low_to_high"
          ? [asc(getSalaryKnownOrder()), asc(getSalarySortValue()), desc(jobs.createdAt)]
          : params.sort === "relevance" && params.q
            ? [desc(relevance), desc(jobs.createdAt)]
            : [desc(jobs.createdAt)]

  const [countRows, results] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`
      })
      .from(jobs)
      .leftJoin(companies, eq(jobs.companyId, companies.id))
      .where(where),
    db
      .select({
        ...getPublicJobSelectShape(relevance)
      })
      .from(jobs)
      .leftJoin(companies, eq(jobs.companyId, companies.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(JOBS_PAGE_SIZE)
      .offset((params.page - 1) * JOBS_PAGE_SIZE)
  ])

  return {
    results: results.map(({ relevance: _relevance, ...job }) => job),
    total: countRows[0]?.total ?? 0,
    page: params.page,
    pageSize: JOBS_PAGE_SIZE,
    appliedFilters: params
  }
}

export async function listPublicJobs() {
  const data = await searchPublicJobs(parseJobsSearchParams(new URLSearchParams()))
  return data.results
}

export async function listLatestPublicJobs(limit = 6) {
  const relevance = sql<number>`0`

  const results = await db
    .select({
      ...getPublicJobSelectShape(relevance)
    })
    .from(jobs)
    .leftJoin(companies, eq(jobs.companyId, companies.id))
    .where(getPublishedJobsFilter())
    .orderBy(desc(jobs.createdAt))
    .limit(limit)

  return results.map(({ relevance: _relevance, ...job }) => job)
}

export async function listTopEmployers(limit = 5): Promise<TopEmployer[]> {
  return db
    .select({
      id: companies.id,
      slug: companies.slug,
      name: companies.name,
      website: companies.website,
      activeJobCount: sql<number>`count(${jobs.id})::int`
    })
    .from(companies)
    .innerJoin(jobs, eq(companies.id, jobs.companyId))
    .where(getPublishedJobsFilter())
    .groupBy(companies.id)
    .orderBy(desc(sql<number>`count(${jobs.id})::int`), asc(companies.name))
    .limit(limit)
}

export async function listPublicJobsForSitemap() {
  return db
    .select({
      slug: jobs.slug,
      activatedAt: jobs.activatedAt,
      createdAt: jobs.createdAt
    })
    .from(jobs)
    .where(getPublishedJobsFilter())
    .orderBy(desc(jobs.activatedAt), desc(jobs.createdAt))
}

export async function listJobsForOwner(ownerAuthId: string) {
  return db
    .select()
    .from(jobs)
    .where(eq(jobs.ownerAuthId, ownerAuthId))
    .orderBy(desc(jobs.createdAt))
}

export async function listAllJobs() {
  return db.select().from(jobs).orderBy(desc(jobs.createdAt))
}

export async function getJobById(id: string) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1)
  return job ?? null
}

export async function getJobBySlug(slug: string) {
  const [job] = await db
    .select({
      id: jobs.id,
      slug: jobs.slug,
      title: jobs.title,
      ownerAuthId: jobs.ownerAuthId,
      companyId: jobs.companyId,
      location: jobs.location,
      salary: jobs.salary,
      workMode: jobs.workMode,
      employmentType: jobs.employmentType,
      category: jobs.category,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      salaryCurrency: jobs.salaryCurrency,
      salaryInterval: jobs.salaryInterval,
      description: jobs.description,
      applyType: jobs.applyType,
      applyUrl: jobs.applyUrl,
      isActive: jobs.isActive,
      listingDurationDays: jobs.listingDurationDays,
      paymentStatus: jobs.paymentStatus,
      activatedAt: jobs.activatedAt,
      expiresAt: jobs.expiresAt,
      stripeCheckoutSessionId: jobs.stripeCheckoutSessionId,
      stripePaymentIntentId: jobs.stripePaymentIntentId,
      createdAt: jobs.createdAt,
      companyName: companies.name,
      companySlug: companies.slug,
      companyWebsite: companies.website
    })
    .from(jobs)
    .leftJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(jobs.slug, slug))
    .limit(1)

  return job ?? null
}

export async function getPublicActiveJobBySlug(slug: string) {
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.slug, slug), getPublishedJobsFilter()))
    .limit(1)

  return job ?? null
}

export async function listActiveJobsForCompany(companyId: string) {
  return db
    .select()
    .from(jobs)
    .where(and(eq(jobs.companyId, companyId), getPublishedJobsFilter()))
    .orderBy(desc(jobs.createdAt))
}

export async function listMatchingPublicJobsForAlert(params: JobsSearchParams, since: Date | null, limit = 10) {
  const { filters } = buildPublicJobFilters(params)

  if (since) {
    filters.push(sql`${jobs.createdAt} > ${since}`)
  }

  const relevance = sql<number>`0`

  const results = await db
    .select({
      ...getPublicJobSelectShape(relevance)
    })
    .from(jobs)
    .leftJoin(companies, eq(jobs.companyId, companies.id))
    .where(and(...filters))
    .orderBy(desc(jobs.createdAt))
    .limit(limit)

  return results.map(({ relevance: _relevance, ...job }) => job)
}

export async function listRelatedJobsForJob(job: PublicJobDetail, limit = 4) {
  const sameLocation = job.location ? ilike(jobs.location, `%${job.location}%`) : null
  const sameCategory = job.category ? eq(jobs.category, job.category) : null
  const sameWorkMode = job.workMode ? eq(jobs.workMode, job.workMode) : null
  const sameEmploymentType = job.employmentType ? eq(jobs.employmentType, job.employmentType) : null

  const relationScore = sql<number>`
    (case when ${job.companyId ? sql`${jobs.companyId} = ${job.companyId}` : sql`false`} then 100 else 0 end) +
    (case when ${sameLocation ?? sql`false`} and ${sameCategory ?? sql`false`} then 35 else 0 end) +
    (case when ${sameLocation ?? sql`false`} and (${sameWorkMode ?? sql`false`} or ${sameEmploymentType ?? sql`false`}) then 20 else 0 end) +
    (case when ${sameCategory ?? sql`false`} then 15 else 0 end) +
    (case when ${sameWorkMode ?? sql`false`} then 10 else 0 end) +
    (case when ${sameEmploymentType ?? sql`false`} then 10 else 0 end)
  `

  const results = await db
    .select({
      ...getPublicJobSelectShape(relationScore)
    })
    .from(jobs)
    .leftJoin(companies, eq(jobs.companyId, companies.id))
    .where(and(getPublishedJobsFilter(), sql`${jobs.id} <> ${job.id}`))
    .orderBy(desc(relationScore), desc(jobs.createdAt))
    .limit(limit)

  return results
    .filter((row) => row.relevance > 0)
    .map(({ relevance: _relevance, ...relatedJob }) => relatedJob)
}

export async function listCompaniesWithActiveJobsForSitemap() {
  return db
    .select({
      slug: companies.slug,
      createdAt: companies.createdAt,
      latestActiveJobActivatedAt: sql<Date | null>`max(${jobs.activatedAt})`,
      latestActiveJobCreatedAt: sql<Date | null>`max(${jobs.createdAt})`
    })
    .from(companies)
    .innerJoin(jobs, eq(companies.id, jobs.companyId))
    .where(getPublishedJobsFilter())
    .groupBy(companies.id)
    .orderBy(desc(sql<Date | null>`max(${jobs.activatedAt})`), desc(sql<Date | null>`max(${jobs.createdAt})`), desc(companies.createdAt))
}
