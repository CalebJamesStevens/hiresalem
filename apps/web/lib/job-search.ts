import { applyTypeEnum, employmentTypeEnum, jobCategoryEnum, salaryIntervalEnum, workModeEnum } from "@repo/db/schema/jobs"

const postedWithinValues = ["any", "1", "3", "7", "14", "30"] as const
const sortValues = ["relevance", "newest", "oldest", "salary_high_to_low", "salary_low_to_high"] as const

export const JOBS_PAGE_SIZE = 10

export type WorkMode = (typeof workModeEnum.enumValues)[number]
export type EmploymentType = (typeof employmentTypeEnum.enumValues)[number]
export type JobCategory = (typeof jobCategoryEnum.enumValues)[number]
export type ApplyType = (typeof applyTypeEnum.enumValues)[number]
export type SalaryInterval = (typeof salaryIntervalEnum.enumValues)[number]
export type PostedWithin = (typeof postedWithinValues)[number]
export type JobsSearchSort = (typeof sortValues)[number]

export type JobsSearchParams = {
  q: string
  location: string
  workMode: WorkMode | "any"
  employmentType: EmploymentType | "any"
  category: JobCategory | "any"
  applyType: ApplyType | "any"
  postedWithin: PostedWithin
  minSalary: number | null
  sort: JobsSearchSort
  page: number
}

export type SearchParamInput = Record<string, string | string[] | undefined> | URLSearchParams

export const workModeOptions = [
  { value: "any", label: "Any work mode" },
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" }
] as const

export const employmentTypeOptions = [
  { value: "any", label: "Any schedule" },
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" }
] as const

export const categoryOptions = [
  { value: "any", label: "Any category" },
  { value: "engineering", label: "Engineering" },
  { value: "design", label: "Design" },
  { value: "operations", label: "Operations" },
  { value: "finance", label: "Finance" },
  { value: "sales", label: "Sales" },
  { value: "marketing", label: "Marketing" },
  { value: "customer_support", label: "Customer Support" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "skilled_trades", label: "Skilled Trades" },
  { value: "hospitality", label: "Hospitality" },
  { value: "administration", label: "Administration" }
] as const

export const applyTypeOptions = [
  { value: "any", label: "Any apply method" },
  { value: "onsite", label: "Apply on HireSalem" },
  { value: "external", label: "External apply" }
] as const

export const postedWithinOptions = [
  { value: "any", label: "Any time" },
  { value: "1", label: "Past 24 hours" },
  { value: "3", label: "Past 3 days" },
  { value: "7", label: "Past 7 days" },
  { value: "14", label: "Past 14 days" },
  { value: "30", label: "Past 30 days" }
] as const

export const salaryIntervalOptions = [
  { value: "year", label: "Per year" },
  { value: "month", label: "Per month" },
  { value: "week", label: "Per week" },
  { value: "hour", label: "Per hour" }
] as const

export const sortOptions = [
  { value: "relevance", label: "Most relevant" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "salary_high_to_low", label: "Highest salary" },
  { value: "salary_low_to_high", label: "Lowest salary" }
] as const

const defaultSearchParams: Omit<JobsSearchParams, "sort"> = {
  q: "",
  location: "",
  workMode: "any",
  employmentType: "any",
  category: "any",
  applyType: "any",
  postedWithin: "any",
  minSalary: null,
  page: 1
}

function getValue(input: SearchParamInput, key: string) {
  if (input instanceof URLSearchParams) {
    return input.get(key) ?? undefined
  }

  const value = input[key]
  return Array.isArray(value) ? value[0] : value
}

function isEnumValue<TValue extends string>(values: readonly TValue[], value: string | undefined): value is TValue {
  return Boolean(value && values.includes(value as TValue))
}

function normalizeSort(value: string | undefined, query: string): JobsSearchSort {
  const defaultSort: JobsSearchSort = query ? "relevance" : "newest"
  if (!value || !isEnumValue(sortValues, value)) {
    return defaultSort
  }

  if (!query && value === "relevance") {
    return "newest"
  }

  return value
}

function normalizePage(value: string | undefined) {
  const page = Number.parseInt(value ?? "", 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

function normalizeMinSalary(value: string | undefined) {
  const amount = Number.parseInt(value ?? "", 10)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export function parseJobsSearchParams(input: SearchParamInput): JobsSearchParams {
  const q = getValue(input, "q")?.trim() ?? ""
  const location = getValue(input, "location")?.trim() ?? ""
  const workMode = getValue(input, "workMode")
  const employmentType = getValue(input, "employmentType")
  const category = getValue(input, "category")
  const applyType = getValue(input, "applyType")
  const postedWithin = getValue(input, "postedWithin")

  return {
    ...defaultSearchParams,
    q,
    location,
    workMode: isEnumValue(workModeEnum.enumValues, workMode) ? workMode : "any",
    employmentType: isEnumValue(employmentTypeEnum.enumValues, employmentType) ? employmentType : "any",
    category: isEnumValue(jobCategoryEnum.enumValues, category) ? category : "any",
    applyType: isEnumValue(applyTypeEnum.enumValues, applyType) ? applyType : "any",
    postedWithin: isEnumValue(postedWithinValues, postedWithin) ? postedWithin : "any",
    minSalary: normalizeMinSalary(getValue(input, "minSalary")),
    sort: normalizeSort(getValue(input, "sort"), q),
    page: normalizePage(getValue(input, "page"))
  }
}

export function buildJobsSearchQuery(params: JobsSearchParams) {
  const searchParams = new URLSearchParams()

  if (params.q) {
    searchParams.set("q", params.q)
  }

  if (params.location) {
    searchParams.set("location", params.location)
  }

  if (params.workMode !== "any") {
    searchParams.set("workMode", params.workMode)
  }

  if (params.employmentType !== "any") {
    searchParams.set("employmentType", params.employmentType)
  }

  if (params.category !== "any") {
    searchParams.set("category", params.category)
  }

  if (params.applyType !== "any") {
    searchParams.set("applyType", params.applyType)
  }

  if (params.postedWithin !== "any") {
    searchParams.set("postedWithin", params.postedWithin)
  }

  if (params.minSalary) {
    searchParams.set("minSalary", String(params.minSalary))
  }

  if (params.sort !== normalizeSort(undefined, params.q)) {
    searchParams.set("sort", params.sort)
  }

  if (params.page > 1) {
    searchParams.set("page", String(params.page))
  }

  return searchParams
}

export function buildJobsSearchPath(params: JobsSearchParams) {
  const query = buildJobsSearchQuery(params).toString()
  return query ? `/jobs?${query}` : "/jobs"
}

export function canonicalizeJobsSearchPath(value: string) {
  const url = new URL(value, "https://hiresalem.local")

  if (url.pathname !== "/jobs") {
    throw new Error("Saved searches must point to /jobs")
  }

  return buildJobsSearchPath(parseJobsSearchParams(url.searchParams))
}

export function getJobsSearchChips(params: JobsSearchParams) {
  const chips: Array<{ label: string; href: string }> = []
  const reset = (key: keyof JobsSearchParams, next: Partial<JobsSearchParams> = {}) =>
    buildJobsSearchPath({
      ...params,
      [key]: defaultSearchParams[key as keyof typeof defaultSearchParams],
      page: 1,
      ...next
    } as JobsSearchParams)

  if (params.q) {
    chips.push({ label: `Keyword: ${params.q}`, href: reset("q") })
  }

  if (params.location) {
    chips.push({ label: `Location: ${params.location}`, href: reset("location") })
  }

  if (params.workMode !== "any") {
    chips.push({
      label: workModeOptions.find((option) => option.value === params.workMode)?.label ?? params.workMode,
      href: reset("workMode")
    })
  }

  if (params.employmentType !== "any") {
    chips.push({
      label: employmentTypeOptions.find((option) => option.value === params.employmentType)?.label ?? params.employmentType,
      href: reset("employmentType")
    })
  }

  if (params.category !== "any") {
    chips.push({
      label: categoryOptions.find((option) => option.value === params.category)?.label ?? params.category,
      href: reset("category")
    })
  }

  if (params.applyType !== "any") {
    chips.push({
      label: applyTypeOptions.find((option) => option.value === params.applyType)?.label ?? params.applyType,
      href: reset("applyType")
    })
  }

  if (params.postedWithin !== "any") {
    chips.push({
      label: postedWithinOptions.find((option) => option.value === params.postedWithin)?.label ?? params.postedWithin,
      href: reset("postedWithin")
    })
  }

  if (params.minSalary) {
    chips.push({ label: `Min salary: $${params.minSalary.toLocaleString()}`, href: reset("minSalary") })
  }

  return chips
}

export function hasActiveJobsSearchFilters(params: JobsSearchParams) {
  return buildJobsSearchQuery({ ...params, page: 1 }).toString().length > 0
}
