"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import { trackAnalyticsEvent } from "@/lib/analytics"

type ApplicationFormProps = {
  jobId: string
  jobTitle: string
  jobLocation?: string | null
  defaultName?: string | null
  defaultEmail?: string | null
}

type FormStatus =
  | {
      tone: "success" | "error" | "info"
      message: string
    }
  | null

function getStatusClassName(tone: NonNullable<FormStatus>["tone"]) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800"
  }

  if (tone === "error") {
    return "border-rose-200 bg-rose-50 text-rose-800"
  }

  return "border-slate-200 bg-slate-50 text-slate-700"
}

export function ApplicationForm({
  jobId,
  jobTitle,
  jobLocation,
  defaultName,
  defaultEmail
}: ApplicationFormProps) {
  const [status, setStatus] = useState<FormStatus>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      setStatus({ tone: "info", message: "Submitting your application..." })
      formData.set("jobId", jobId)
      trackAnalyticsEvent("apply_click")

      const response = await fetch("/api/applications", {
        method: "POST",
        body: formData
      })

      if (response.ok) {
        setIsSubmitted(true)
        setStatus({
          tone: "success",
          message: "Application submitted. You can track it from your dashboard."
        })
        return
      }

      const body = (await response.json().catch(() => ({}))) as { error?: string }
      setStatus({
        tone: "error",
        message: body.error ?? "Failed to submit application."
      })
    })
  }

  return (
    <form action={onSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Apply with HireSalem</p>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900">Submit your application</h2>
          <p className="text-sm text-slate-600">
            You&apos;re applying for <span className="font-medium text-slate-900">{jobTitle}</span>
            {jobLocation ? ` in ${jobLocation}` : ""}. Add the essentials now, and the employer can follow up directly.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Include a resume, LinkedIn, portfolio, or a short note so employers have enough context to move quickly.
      </div>

      <fieldset disabled={isPending || isSubmitted} className="space-y-5 disabled:opacity-70">
        <input type="hidden" name="jobId" value={jobId} />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-800">
              Full name
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={defaultName ?? ""}
              placeholder="Jordan Lee"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-800">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={defaultEmail ?? ""}
              placeholder="jordan@example.com"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-slate-800">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="(503) 555-0123"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="location" className="text-sm font-medium text-slate-800">
              Location
            </label>
            <input
              id="location"
              name="location"
              placeholder="Salem, OR"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="resume" className="text-sm font-medium text-slate-800">
              Resume file
            </label>
            <input
              id="resume"
              name="resume"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            />
            <p className="text-xs text-slate-500">PDF, DOC, or DOCX up to 5 MB.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="linkedinUrl" className="text-sm font-medium text-slate-800">
              LinkedIn URL
            </label>
            <input
              id="linkedinUrl"
              name="linkedinUrl"
              type="url"
              placeholder="https://linkedin.com/in/your-name"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="portfolioUrl" className="text-sm font-medium text-slate-800">
              Portfolio or personal site
            </label>
            <input
              id="portfolioUrl"
              name="portfolioUrl"
              type="url"
              placeholder="https://your-site.com"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="coverLetter" className="text-sm font-medium text-slate-800">
            Why are you a fit?
          </label>
          <textarea
            id="coverLetter"
            name="coverLetter"
            rows={6}
            placeholder="Share a few relevant wins, recent projects, or why this role caught your attention."
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
          />
        </div>

        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            Your application is tied to this account so you can review it later in your dashboard.
          </div>
          <button
            type="submit"
            disabled={isPending || isSubmitted}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Submitting..." : isSubmitted ? "Application submitted" : "Submit application"}
          </button>
        </div>
      </fieldset>

      {status ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${getStatusClassName(status.tone)}`}>
          <p>{status.message}</p>
          {status.tone === "success" ? (
            <p className="mt-2">
              <Link href="/dashboard/applications" className="font-medium underline">
                View your applications
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  )
}
