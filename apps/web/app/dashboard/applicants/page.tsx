import Link from "next/link"

import { ApplicantWorkflowPanel } from "@/components/applicant-workflow-panel"
import {
  applicantStageOptions,
  buildApplicantInboxPath,
  getApplicationStageBadgeClassName,
  getApplicationStageLabel,
  parseApplicantInboxParams
} from "@/lib/applicant-inbox"
import { hasRole } from "@/lib/authz"
import {
  getEmployerApplicationStageCounts,
  listEmployerApplicantJobs,
  listEmployerApplications
} from "@/lib/applicants"
import { requirePageRoles } from "@/lib/page-auth"

export const dynamic = "force-dynamic"

type DashboardApplicantsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function formatSubmittedAt(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(date))
}

function formatDateTime(date: Date | null) {
  if (!date) {
    return null
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(date))
}

export default async function DashboardApplicantsPage({ searchParams }: DashboardApplicantsPageProps) {
  const user = await requirePageRoles(["business", "admin"], "/dashboard/applicants")
  const params = parseApplicantInboxParams(await searchParams)
  const viewer = {
    id: user.id,
    isAdmin: hasRole(user.roles, "admin")
  }

  const [applications, jobs] = await Promise.all([
    listEmployerApplications(viewer, params),
    listEmployerApplicantJobs(viewer)
  ])

  const selectedApplication =
    applications.find((application) => application.id === params.applicationId) ?? applications[0] ?? null
  const counts = getEmployerApplicationStageCounts(applications)

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{viewer.isAdmin ? "Applicant inbox" : "Your applicant inbox"}</h1>
        <p className="text-sm text-slate-600">
          Review applicants across your jobs, move them through stages, and keep private hiring notes in one place.
        </p>
      </div>

      <form className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)_minmax(180px,0.7fr)_auto]">
        <div className="space-y-1.5">
          <label htmlFor="q" className="text-sm font-medium text-slate-800">
            Search applicants
          </label>
          <input
            id="q"
            name="q"
            defaultValue={params.q}
            placeholder="Search by name or email"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="jobId" className="text-sm font-medium text-slate-800">
            Job
          </label>
          <select
            id="jobId"
            name="jobId"
            defaultValue={params.jobId}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900"
          >
            <option value="">All jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} ({job.applicationCount})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="stage" className="text-sm font-medium text-slate-800">
            Stage
          </label>
          <select
            id="stage"
            name="stage"
            defaultValue={params.stage}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900"
          >
            {applicantStageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">
            Apply filters
          </button>
          <Link
            href="/dashboard/applicants"
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Filtered total</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{applications.length}</p>
        </div>
        {applicantStageOptions
          .filter((option) => option.value !== "any")
          .map((option) => (
            <div key={option.value} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{option.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {counts[option.value]}
              </p>
            </div>
          ))}
      </div>

      {applications.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          No applicants match these filters yet.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="space-y-3">
            {applications.map((application) => {
              const isSelected = selectedApplication?.id === application.id
              const path = buildApplicantInboxPath({
                ...params,
                applicationId: application.id
              })

              return (
                <Link
                  key={application.id}
                  href={path}
                  className={`block rounded-3xl border bg-white p-4 shadow-sm transition ${
                    isSelected ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-slate-950">{application.name}</p>
                      <p className="text-sm text-slate-600">
                        {application.email} • {application.jobTitle}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getApplicationStageBadgeClassName(application.stage)}`}
                    >
                      {getApplicationStageLabel(application.stage)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span>Submitted {formatSubmittedAt(application.createdAt)}</span>
                    {application.location ? <span>{application.location}</span> : null}
                    {!application.jobIsActive ? <span className="text-amber-700">Job closed</span> : null}
                  </div>
                </Link>
              )
            })}
          </div>

          {selectedApplication ? (
            <div className="space-y-4">
              <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold text-slate-950">{selectedApplication.name}</h2>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getApplicationStageBadgeClassName(selectedApplication.stage)}`}
                    >
                      {getApplicationStageLabel(selectedApplication.stage)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Applied to{" "}
                    <Link href={`/jobs/${selectedApplication.jobSlug}`} className="underline">
                      {selectedApplication.jobTitle}
                    </Link>{" "}
                    on {formatSubmittedAt(selectedApplication.createdAt)}
                  </p>
                </div>

                <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                  <p>Email: {selectedApplication.email}</p>
                  {selectedApplication.phone ? <p>Phone: {selectedApplication.phone}</p> : null}
                  {selectedApplication.location ? <p>Location: {selectedApplication.location}</p> : null}
                  {formatDateTime(selectedApplication.nextStepAt) ? (
                    <p>Next step: {formatDateTime(selectedApplication.nextStepAt)}</p>
                  ) : null}
                  {formatDateTime(selectedApplication.lastContactedAt) ? (
                    <p>Last contacted: {formatDateTime(selectedApplication.lastContactedAt)}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-700">
                  {selectedApplication.resume ? (
                    <Link href={selectedApplication.resume} target="_blank" rel="noreferrer" className="underline">
                      Resume
                    </Link>
                  ) : null}
                  {selectedApplication.linkedinUrl ? (
                    <Link
                      href={selectedApplication.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      LinkedIn
                    </Link>
                  ) : null}
                  {selectedApplication.portfolioUrl ? (
                    <Link
                      href={selectedApplication.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Portfolio
                    </Link>
                  ) : null}
                </div>

                {selectedApplication.coverLetter ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Candidate note</p>
                    <p className="whitespace-pre-wrap">{selectedApplication.coverLetter}</p>
                  </div>
                ) : null}

                {selectedApplication.nextStepNote ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next step</p>
                    <p className="whitespace-pre-wrap">{selectedApplication.nextStepNote}</p>
                  </div>
                ) : null}
              </div>

              <ApplicantWorkflowPanel
                applicationId={selectedApplication.id}
                stage={selectedApplication.stage}
                internalNotes={selectedApplication.internalNotes}
                nextStepAt={selectedApplication.nextStepAt}
                nextStepNote={selectedApplication.nextStepNote}
                lastContactedAt={selectedApplication.lastContactedAt}
              />
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
