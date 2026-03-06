import { applicationStageEnum } from "@repo/db/schema/applications"

export type ApplicationStage = (typeof applicationStageEnum.enumValues)[number]
export type ApplicantInboxStageFilter = ApplicationStage | "any"
export type SearchParamInput = Record<string, string | string[] | undefined> | URLSearchParams

export type ApplicantInboxParams = {
  q: string
  jobId: string
  stage: ApplicantInboxStageFilter
  applicationId: string
}

const defaultApplicantInboxParams: ApplicantInboxParams = {
  q: "",
  jobId: "",
  stage: "any",
  applicationId: ""
}

export const applicantStageOptions = [
  { value: "any", label: "All stages" },
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" }
] as const

const stageLabels: Record<ApplicationStage, string> = {
  new: "New",
  reviewed: "Reviewed",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected"
}

function getValue(input: SearchParamInput, key: string) {
  if (input instanceof URLSearchParams) {
    return input.get(key) ?? undefined
  }

  const value = input[key]
  return Array.isArray(value) ? value[0] : value
}

function isStage(value: string | undefined): value is ApplicationStage {
  return Boolean(value && applicationStageEnum.enumValues.includes(value as ApplicationStage))
}

export function parseApplicantInboxParams(input: SearchParamInput): ApplicantInboxParams {
  const q = getValue(input, "q")?.trim() ?? ""
  const jobId = getValue(input, "jobId")?.trim() ?? ""
  const applicationId = getValue(input, "applicationId")?.trim() ?? ""
  const stage = getValue(input, "stage")

  return {
    ...defaultApplicantInboxParams,
    q,
    jobId,
    applicationId,
    stage: isStage(stage) ? stage : "any"
  }
}

export function buildApplicantInboxQuery(params: ApplicantInboxParams) {
  const searchParams = new URLSearchParams()

  if (params.q) {
    searchParams.set("q", params.q)
  }

  if (params.jobId) {
    searchParams.set("jobId", params.jobId)
  }

  if (params.stage !== "any") {
    searchParams.set("stage", params.stage)
  }

  if (params.applicationId) {
    searchParams.set("applicationId", params.applicationId)
  }

  return searchParams
}

export function buildApplicantInboxPath(params: ApplicantInboxParams) {
  const query = buildApplicantInboxQuery(params).toString()
  return query ? `/dashboard/applicants?${query}` : "/dashboard/applicants"
}

export function getApplicationStageLabel(stage: ApplicationStage) {
  return stageLabels[stage]
}

export function getApplicationStageBadgeClassName(stage: ApplicationStage) {
  switch (stage) {
    case "new":
      return "border-sky-200 bg-sky-50 text-sky-700"
    case "reviewed":
      return "border-violet-200 bg-violet-50 text-violet-700"
    case "interviewing":
      return "border-amber-200 bg-amber-50 text-amber-800"
    case "offer":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700"
  }
}
