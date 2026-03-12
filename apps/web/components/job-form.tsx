"use client"

import Link from "next/link"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { FeaturedJobBadge } from "@/components/featured-job-badge"
import { MarkdownContent } from "@/components/markdown-content"
import type { EmployerJobLifecycleStatus } from "@/lib/job-listing-billing"
import { categoryOptions, employmentTypeOptions, salaryIntervalOptions, workModeOptions } from "@/lib/job-search"
import {
  JOB_LISTING_DEFAULT_DAYS,
  JOB_LISTING_MAX_DAYS,
  JOB_LISTING_MIN_DAYS
} from "@/lib/job-listing-billing"

type ApplyType = "onsite" | "external"
type CompanySelection = "" | "__new__" | string

type ExistingCompany = {
  id: string
  name: string
  slug: string
  website: string | null
}

type JobFormInitialValues = {
  id: string
  slug: string
  title: string
  location: string | null
  jobLocationCity: string | null
  jobLocationRegion: string | null
  jobLocationCountry: string | null
  streetAddress: string | null
  postalCode: string | null
  salary: string | null
  workMode: "onsite" | "hybrid" | "remote" | null
  employmentType: "full_time" | "part_time" | "contract" | "internship" | "temporary" | null
  category:
    | "engineering"
    | "design"
    | "operations"
    | "finance"
    | "sales"
    | "marketing"
    | "customer_support"
    | "healthcare"
    | "education"
    | "skilled_trades"
    | "hospitality"
    | "administration"
    | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  salaryInterval: "hour" | "week" | "month" | "year" | null
  description: string | null
  applyType: ApplyType
  applyUrl: string | null
  isFeatured: boolean
  listingDurationDays: number
  companyId: string | null
}

type PreviewState = {
  title: string
  companyName: string | null
  location: string | null
  workMode: string | null
  employmentType: string | null
  category: string | null
  salary: string | null
  description: string | null
  applyType: ApplyType
  applyUrl: string | null
  isFeatured: boolean
}

function formatOptionLabel<TValue extends string>(value: TValue | "", options: ReadonlyArray<{ value: TValue | "any"; label: string }>) {
  if (!value) {
    return null
  }

  const option = options.find((item) => item.value === value)
  return option?.label ?? value
}

function buildPreviewState(formData: FormData, existingCompanies: ExistingCompany[], postingCompanyName: string | null): PreviewState {
  const companySelection = String(formData.get("companySelection") ?? "")
  const companyName =
    companySelection === "__new__"
      ? String(formData.get("newCompanyName") ?? "").trim() || null
      : existingCompanies.find((company) => company.id === companySelection)?.name ?? postingCompanyName

  return {
    title: String(formData.get("title") ?? "").trim() || "Untitled job",
    companyName,
    location: String(formData.get("location") ?? "").trim() || null,
    workMode: formatOptionLabel(String(formData.get("workMode") ?? "") as "" | "onsite" | "hybrid" | "remote", workModeOptions),
    employmentType: formatOptionLabel(
      String(formData.get("employmentType") ?? "") as "" | "full_time" | "part_time" | "contract" | "internship" | "temporary",
      employmentTypeOptions
    ),
    category: formatOptionLabel(
      String(formData.get("category") ?? "") as
        | ""
        | "engineering"
        | "design"
        | "operations"
        | "finance"
        | "sales"
        | "marketing"
        | "customer_support"
        | "healthcare"
        | "education"
        | "skilled_trades"
        | "hospitality"
        | "administration",
      categoryOptions
    ),
    salary: String(formData.get("salary") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    applyType: String(formData.get("applyType") ?? "onsite") as ApplyType,
    applyUrl: String(formData.get("applyUrl") ?? "").trim() || null,
    isFeatured: Boolean(formData.get("isFeatured"))
  }
}

export function JobForm({
  disabled = false,
  requiresPayment = true,
  isAdmin = false,
  existingCompanies = [],
  initialValues = null,
  postingCompanyName = null,
  canSaveDraft = false,
  canPublish = true,
  publishDisabledMessage = null,
  fixedListingDurationDays = null,
  activeJobsCount = 0,
  activeJobsLimit = null,
  planLabel = null,
  initialStatus = null,
  canFeatureJob = false,
  featuredPlacementEligible = false
}: {
  disabled?: boolean
  requiresPayment?: boolean
  isAdmin?: boolean
  existingCompanies?: ExistingCompany[]
  initialValues?: JobFormInitialValues | null
  postingCompanyName?: string | null
  canSaveDraft?: boolean
  canPublish?: boolean
  publishDisabledMessage?: string | null
  fixedListingDurationDays?: number | null
  activeJobsCount?: number
  activeJobsLimit?: number | null
  planLabel?: string | null
  initialStatus?: EmployerJobLifecycleStatus | null
  canFeatureJob?: boolean
  featuredPlacementEligible?: boolean
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const isEditing = Boolean(initialValues)
  const editingJobId = initialValues?.id ?? null
  const [status, setStatus] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [applyType, setApplyType] = useState<ApplyType>(initialValues?.applyType ?? "onsite")
  const [workMode, setWorkMode] = useState<"" | "onsite" | "hybrid" | "remote">(initialValues?.workMode ?? "")
  const [companySelection, setCompanySelection] = useState<CompanySelection>(isAdmin ? (initialValues?.companyId ?? "") : "")
  const [listingDurationDays, setListingDurationDays] = useState(fixedListingDurationDays ?? initialValues?.listingDurationDays ?? JOB_LISTING_DEFAULT_DAYS)
  const [isPending, startTransition] = useTransition()
  const effectiveListingDurationDays = fixedListingDurationDays ?? listingDurationDays
  const showsDraftControls = canSaveDraft && (!isEditing || initialStatus === "draft")

  function onPreview() {
    if (!formRef.current || disabled) {
      return
    }

    setPreview(buildPreviewState(new FormData(formRef.current), existingCompanies, postingCompanyName))
  }

  function onSubmit(formData: FormData) {
    if (disabled) {
      return
    }

    startTransition(async () => {
      setStatus(isEditing ? "Saving..." : "Submitting...")
      const submissionAction = String(formData.get("submissionAction") ?? (showsDraftControls ? "publish" : "save"))

      const nextApplyType = String(formData.get("applyType") ?? "onsite") as ApplyType
      const applyUrl = String(formData.get("applyUrl") ?? "").trim()
      const companySelection = String(formData.get("companySelection") ?? "")
      const isNewCompany = companySelection === "__new__"

      const payload = {
        title: String(formData.get("title") ?? ""),
        location: String(formData.get("location") ?? ""),
        jobLocationCity: String(formData.get("jobLocationCity") ?? "") || undefined,
        jobLocationRegion: String(formData.get("jobLocationRegion") ?? "") || undefined,
        jobLocationCountry: String(formData.get("jobLocationCountry") ?? "") || undefined,
        streetAddress: String(formData.get("streetAddress") ?? "") || undefined,
        postalCode: String(formData.get("postalCode") ?? "") || undefined,
        salary: String(formData.get("salary") ?? ""),
        workMode: String(formData.get("workMode") ?? "") || undefined,
        employmentType: String(formData.get("employmentType") ?? "") || undefined,
        category: String(formData.get("category") ?? "") || undefined,
        salaryMin: String(formData.get("salaryMin") ?? "") || undefined,
        salaryMax: String(formData.get("salaryMax") ?? "") || undefined,
        salaryCurrency: String(formData.get("salaryCurrency") ?? "") || undefined,
        salaryInterval: String(formData.get("salaryInterval") ?? "") || undefined,
        description: String(formData.get("description") ?? ""),
        applyType: nextApplyType,
        applyUrl: nextApplyType === "external" ? applyUrl : undefined,
        isFeatured: Boolean(formData.get("isFeatured")),
        listingDurationDays: String(formData.get("listingDurationDays") ?? effectiveListingDurationDays),
        companyId: companySelection && !isNewCompany ? companySelection : undefined,
        newCompanyName: isNewCompany ? String(formData.get("newCompanyName") ?? "") : undefined,
        newCompanyWebsite: isNewCompany ? String(formData.get("newCompanyWebsite") ?? "") : undefined,
        website: String(formData.get("website") ?? ""),
        submissionAction
      }

      const response = await fetch(isEditing && editingJobId ? `/api/jobs/${editingJobId}` : "/api/jobs", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setStatus(
          submissionAction === "draft" ? "Draft saved." : isEditing && initialStatus === "draft" ? "Job published." : isEditing ? "Job updated." : "Job posted."
        )
        router.push("/dashboard/jobs")
        router.refresh()
        return
      }

      const body = (await response.json().catch(() => ({}))) as { error?: string }
      setStatus(body.error ?? (isEditing ? "Failed to update job." : "Failed to post job."))
    })
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} action={onSubmit} className="space-y-4 rounded-lg border bg-white p-5">
        <div className="space-y-1">
          <label htmlFor="title" className="text-sm font-medium">
            Job title
          </label>
          <input id="title" name="title" required defaultValue={initialValues?.title ?? ""} disabled={disabled} className="w-full rounded border px-3 py-2" />
        </div>

        {isAdmin ? (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-1">
              <label htmlFor="companySelection" className="text-sm font-medium">
                Company
              </label>
              <select
                id="companySelection"
                name="companySelection"
                disabled={disabled}
                value={companySelection}
                onChange={(event) => setCompanySelection(event.target.value)}
                className="w-full rounded border px-3 py-2"
              >
                <option value="">Select company</option>
                <option value="__new__">Add new company</option>
                {existingCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.slug})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Select an existing company profile or add a new one inline for this job.</p>
            </div>

            {companySelection === "__new__" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="newCompanyName" className="text-sm font-medium">
                    New company name
                  </label>
                  <input id="newCompanyName" name="newCompanyName" required disabled={disabled} className="w-full rounded border px-3 py-2" />
                </div>

                <div className="space-y-1">
                  <label htmlFor="newCompanyWebsite" className="text-sm font-medium">
                    New company website
                  </label>
                  <input
                    id="newCompanyWebsite"
                    name="newCompanyWebsite"
                    type="url"
                    placeholder="https://example.com"
                    disabled={disabled}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : postingCompanyName ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">Posting as {postingCompanyName}.</p>
        ) : null}

        {!isAdmin && planLabel ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p>
              Current plan: <span className="font-medium text-slate-900">{planLabel}</span>
            </p>
            {activeJobsLimit !== null ? (
              <p className="mt-1">
                Live jobs: {activeJobsCount} / {activeJobsLimit}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-1">
          <label htmlFor="location" className="text-sm font-medium">
            Location
          </label>
          <input id="location" name="location" defaultValue={initialValues?.location ?? ""} disabled={disabled} className="w-full rounded border px-3 py-2" />
          <p className="text-xs text-slate-500">Use city and state at minimum, like "Salem, OR".</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="jobLocationCity" className="text-sm font-medium">
              Schema city
            </label>
            <input
              id="jobLocationCity"
              name="jobLocationCity"
              required={workMode !== "remote"}
              defaultValue={initialValues?.jobLocationCity ?? ""}
              disabled={disabled}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="jobLocationRegion" className="text-sm font-medium">
              Schema region
            </label>
            <input
              id="jobLocationRegion"
              name="jobLocationRegion"
              required={workMode !== "remote"}
              defaultValue={initialValues?.jobLocationRegion ?? "OR"}
              disabled={disabled}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="jobLocationCountry" className="text-sm font-medium">
              Schema country
            </label>
            <input
              id="jobLocationCountry"
              name="jobLocationCountry"
              required={workMode !== "remote"}
              defaultValue={initialValues?.jobLocationCountry ?? "US"}
              disabled={disabled}
              className="w-full rounded border px-3 py-2"
            />
            <p className="text-xs text-slate-500">Used for Google Job Posting markup. Required for non-remote jobs.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="streetAddress" className="text-sm font-medium">
              Street address
            </label>
            <input
              id="streetAddress"
              name="streetAddress"
              defaultValue={initialValues?.streetAddress ?? ""}
              disabled={disabled}
              className="w-full rounded border px-3 py-2"
            />
            <p className="text-xs text-slate-500">Optional, but recommended for Google Job Posting markup.</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="postalCode" className="text-sm font-medium">
              Postal code
            </label>
            <input
              id="postalCode"
              name="postalCode"
              inputMode="numeric"
              defaultValue={initialValues?.postalCode ?? ""}
              disabled={disabled}
              className="w-full rounded border px-3 py-2"
            />
            <p className="text-xs text-slate-500">Optional ZIP code for the job location.</p>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="salary" className="text-sm font-medium">
            Salary summary
          </label>
          <input id="salary" name="salary" defaultValue={initialValues?.salary ?? ""} disabled={disabled} className="w-full rounded border px-3 py-2" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="workMode" className="text-sm font-medium">
              Work mode
            </label>
            <select
              id="workMode"
              name="workMode"
              value={workMode}
              disabled={disabled}
              onChange={(event) => setWorkMode(event.target.value as "" | "onsite" | "hybrid" | "remote")}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Select work mode</option>
              {workModeOptions
                .filter((option) => option.value !== "any")
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="employmentType" className="text-sm font-medium">
              Employment type
            </label>
            <select
              id="employmentType"
              name="employmentType"
              defaultValue={initialValues?.employmentType ?? ""}
              disabled={disabled}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Select type</option>
              {employmentTypeOptions
                .filter((option) => option.value !== "any")
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="category" className="text-sm font-medium">
              Category
            </label>
            <select id="category" name="category" defaultValue={initialValues?.category ?? ""} disabled={disabled} className="w-full rounded border px-3 py-2">
              <option value="">Select category</option>
              {categoryOptions
                .filter((option) => option.value !== "any")
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor="salaryMin" className="text-sm font-medium">
              Salary min
            </label>
            <input
              id="salaryMin"
              name="salaryMin"
              type="number"
              min="1"
              step="0.01"
              defaultValue={initialValues?.salaryMin ?? ""}
              disabled={disabled}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="salaryMax" className="text-sm font-medium">
              Salary max
            </label>
            <input
              id="salaryMax"
              name="salaryMax"
              type="number"
              min="1"
              step="0.01"
              defaultValue={initialValues?.salaryMax ?? ""}
              disabled={disabled}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="salaryCurrency" className="text-sm font-medium">
              Currency
            </label>
            <input
              id="salaryCurrency"
              name="salaryCurrency"
              defaultValue={initialValues?.salaryCurrency ?? "USD"}
              maxLength={3}
              disabled={disabled}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="salaryInterval" className="text-sm font-medium">
              Salary interval
            </label>
            <select
              id="salaryInterval"
              name="salaryInterval"
              defaultValue={initialValues?.salaryInterval ?? ""}
              disabled={disabled}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Select interval</option>
              {salaryIntervalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={10}
            defaultValue={initialValues?.description ?? ""}
            disabled={disabled}
            className="w-full rounded border px-3 py-2"
          />
          <p className="text-xs text-slate-500">Markdown is supported for job descriptions.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="listingDurationDays" className="text-sm font-medium">
            Listing duration (days)
          </label>
          <input
            id="listingDurationDays"
            name="listingDurationDays"
            type="number"
            min={JOB_LISTING_MIN_DAYS}
            max={JOB_LISTING_MAX_DAYS}
            value={effectiveListingDurationDays}
            readOnly={isEditing || fixedListingDurationDays !== null}
            disabled={disabled}
            onChange={(event) => {
              if (isEditing || fixedListingDurationDays !== null) {
                return
              }

              const nextValue = Number.parseInt(event.target.value || String(JOB_LISTING_DEFAULT_DAYS), 10)
              const safeValue = Number.isNaN(nextValue) ? JOB_LISTING_DEFAULT_DAYS : nextValue
              setListingDurationDays(Math.min(JOB_LISTING_MAX_DAYS, Math.max(JOB_LISTING_MIN_DAYS, safeValue)))
            }}
            className="w-full rounded border px-3 py-2"
          />
          {fixedListingDurationDays !== null ? (
            <p className="text-sm text-slate-600">Free-plan listings run for {fixedListingDurationDays} days. Longer durations are not available on this plan.</p>
          ) : isEditing ? (
            <p className="text-sm text-slate-600">Listing duration stays fixed after posting. Edit the content without changing billing.</p>
          ) : requiresPayment ? (
            <p className="text-sm text-slate-600">Businesses are charged per day for this listing.</p>
          ) : null}
        </div>

        {canFeatureJob ? (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <FeaturedJobBadge inactive={!featuredPlacementEligible} />
              <p className="text-sm font-medium text-slate-900">Give this role stronger visibility on supported HireSalem listing surfaces.</p>
            </div>
            <label className="flex items-start gap-3">
              <input
                id="isFeatured"
                name="isFeatured"
                type="checkbox"
                value="true"
                defaultChecked={initialValues?.isFeatured ?? false}
                disabled={disabled}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">
                Mark this job as featured to add a featured badge and boosted placement where HireSalem supports it.
              </span>
            </label>
            {!featuredPlacementEligible ? (
              <p className="text-sm text-slate-700">
                Boosted placement is currently available on Featured Job or Business Pro. You can keep this flag on an existing featured job or remove it
                here.
              </p>
            ) : null}
          </div>
        ) : !isAdmin ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium text-amber-950">Featured placement is locked on this plan.</p>
            <p className="mt-1">Add a featured badge and boosted placement with Featured Job or Business Pro.</p>
            <Link href="/dashboard/plan" className="mt-3 inline-flex font-medium underline underline-offset-4">
              View plan options
            </Link>
          </div>
        ) : null}

        <div className="space-y-1">
          <label htmlFor="applyType" className="text-sm font-medium">
            Apply method
          </label>
          <select
            id="applyType"
            name="applyType"
            className="w-full rounded border px-3 py-2"
            disabled={disabled}
            value={applyType}
            onChange={(event) => setApplyType(event.target.value as ApplyType)}
          >
            <option value="onsite">Apply on HireSalem</option>
            <option value="external">External apply link</option>
          </select>
        </div>

        {applyType === "external" ? (
          <div className="space-y-1">
            <label htmlFor="applyUrl" className="text-sm font-medium">
              External apply URL
            </label>
            <input
              id="applyUrl"
              name="applyUrl"
              type="url"
              required
              defaultValue={initialValues?.applyUrl ?? ""}
              disabled={disabled}
              className="w-full rounded border px-3 py-2"
            />
          </div>
        ) : null}

        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onPreview} disabled={isPending || disabled} className="rounded border px-4 py-2 text-sm font-medium">
            Preview
          </button>
          {showsDraftControls ? (
            <button
              type="submit"
              name="submissionAction"
              value="draft"
              disabled={isPending || disabled}
              className="rounded border px-4 py-2 text-sm font-medium"
            >
              {isPending ? "Working..." : "Save draft"}
            </button>
          ) : null}
          <button
            type="submit"
            name="submissionAction"
            value={showsDraftControls ? "publish" : "save"}
            disabled={isPending || disabled || (showsDraftControls && !canPublish)}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Working..." : showsDraftControls ? "Publish job" : isEditing ? "Save changes" : "Post job"}
          </button>
          {isEditing && initialValues ? (
            <Link href={`/jobs/${initialValues.slug}`} className="text-sm text-slate-600 underline underline-offset-4">
              View live job
            </Link>
          ) : null}
          {status ? <p className="text-sm text-slate-600">{status}</p> : null}
        </div>
        {showsDraftControls && publishDisabledMessage ? <p className="text-sm text-amber-700">{publishDisabledMessage}</p> : null}
      </form>

      {preview ? (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Preview</p>
            <div className="space-y-1">
              {preview.isFeatured ? <FeaturedJobBadge /> : null}
              <h2 className="text-2xl font-bold text-slate-950">{preview.title}</h2>
              {preview.companyName ? <p className="text-sm font-medium text-slate-700">{preview.companyName}</p> : null}
              <p className="text-sm text-slate-600">{preview.location ?? "Salem, OR"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[preview.workMode, preview.employmentType, preview.category, preview.salary].filter(Boolean).map((item) => (
              <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {item}
              </span>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">{preview.applyType === "external" ? "External apply" : "Apply on HireSalem"}</p>
            {preview.applyType === "external" && preview.applyUrl ? <p className="mt-1 text-sm text-slate-600 break-all">{preview.applyUrl}</p> : null}
          </div>

          <div className="prose prose-slate max-w-none">
            <MarkdownContent value={preview.description} fallback="No description yet." />
          </div>
        </section>
      ) : null}
    </div>
  )
}
