import { buildJobPostingJsonLd, type JobLocationInput } from "@/lib/structured-data"

export type JobPostingEligibilityReason =
  | "missing_title"
  | "missing_description"
  | "missing_hiring_organization"
  | "missing_job_location"
  | "missing_applicant_location_requirements"

type JobPostingEligibilityInput = {
  title?: string | null
  description?: string | null
  path: string
  datePosted?: Date | null
  validThrough?: Date | null
  employmentType?: string | null
  hiringOrganizationName?: string | null
  hiringOrganizationWebsite?: string | null
  jobLocation?: JobLocationInput | null
  applicantLocationCountry?: string | null
  isRemote?: boolean
  baseSalary?: {
    currency: string
    minValue?: number | null
    maxValue?: number | null
    unitText?: string | null
  } | null
}

export type JobPostingEligibilityResult = {
  eligible: boolean
  reasons: JobPostingEligibilityReason[]
  jsonLd: ReturnType<typeof buildJobPostingJsonLd> | null
}

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getEmploymentKeywords(description: string) {
  const normalized = description.toLowerCase()

  return {
    fullTime: /\bfull[-\s]?time\b/.test(normalized),
    partTime: /\bpart[-\s]?time\b/.test(normalized),
    internship: /\bintern(ship)?\b/.test(normalized),
    temporary: /\btemporary\b|\btemp\b/.test(normalized),
    permanent: /\bpermanent\b/.test(normalized)
  }
}

export function getSchemaEmploymentType(input: { employmentType?: string | null; description?: string | null }) {
  const employmentType = cleanText(input.employmentType)
  const description = cleanText(input.description)

  if (!employmentType) {
    return null
  }

  if (!description) {
    return employmentType
  }

  const keywords = getEmploymentKeywords(description)

  if (employmentType === "internship" && (keywords.fullTime || keywords.partTime || keywords.permanent)) {
    return null
  }

  if (employmentType === "full_time" && keywords.partTime) {
    return null
  }

  if (employmentType === "part_time" && keywords.fullTime) {
    return null
  }

  if (employmentType === "temporary" && keywords.permanent) {
    return null
  }

  return employmentType
}

export function buildEligibleJobPostingJsonLd(input: JobPostingEligibilityInput): JobPostingEligibilityResult {
  const reasons: JobPostingEligibilityReason[] = []
  const title = cleanText(input.title)
  const description = cleanText(input.description)
  const hiringOrganizationName = cleanText(input.hiringOrganizationName)
  const applicantLocationCountry = cleanText(input.applicantLocationCountry)

  if (!title) {
    reasons.push("missing_title")
  }

  if (!description) {
    reasons.push("missing_description")
  }

  if (!hiringOrganizationName) {
    reasons.push("missing_hiring_organization")
  }

  if (input.isRemote) {
    if (!applicantLocationCountry) {
      reasons.push("missing_applicant_location_requirements")
    }
  } else if (!input.jobLocation?.city || !input.jobLocation.region || !input.jobLocation.country) {
    reasons.push("missing_job_location")
  }

  if (reasons.length > 0 || !input.datePosted || !title || !description || !hiringOrganizationName) {
    return {
      eligible: false,
      reasons,
      jsonLd: null
    }
  }

  return {
    eligible: true,
    reasons,
    jsonLd: buildJobPostingJsonLd({
      title,
      description,
      path: input.path,
      datePosted: input.datePosted,
      validThrough: input.validThrough,
      employmentType: getSchemaEmploymentType({
        employmentType: input.employmentType,
        description
      }),
      hiringOrganizationName,
      hiringOrganizationWebsite: cleanText(input.hiringOrganizationWebsite),
      jobLocation: input.jobLocation,
      applicantLocationCountry,
      isRemote: input.isRemote,
      baseSalary: input.baseSalary
    })
  }
}
