"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import type { SavedJobListing } from "@/lib/saved-jobs"

type SavedJobsManagerProps = {
  initialSavedJobs: SavedJobListing[]
}

function getStateLabel(savedJob: Pick<SavedJobListing, "jobIsActive" | "jobPaymentStatus" | "jobActivatedAt" | "jobExpiresAt">) {
  if (!savedJob.jobIsActive || savedJob.jobPaymentStatus !== "paid") {
    return "Closed"
  }

  if (savedJob.jobExpiresAt && new Date(savedJob.jobExpiresAt).getTime() < Date.now()) {
    return "Closed"
  }

  return "Live"
}

export function SavedJobsManager({ initialSavedJobs }: SavedJobsManagerProps) {
  const [savedJobs, setSavedJobs] = useState(initialSavedJobs)
  const [status, setStatus] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onToggleAlerts(jobId: string, alertsEnabled: boolean) {
    startTransition(async () => {
      const response = await fetch(`/api/saved-jobs/${jobId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ alertsEnabled })
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setStatus(body.error ?? "Unable to update alerts.")
        return
      }

      setSavedJobs((current) => current.map((job) => (job.jobId === jobId ? { ...job, alertsEnabled } : job)))
      setStatus(alertsEnabled ? "Saved job alerts enabled." : "Saved job alerts paused.")
    })
  }

  function onRemove(jobId: string) {
    startTransition(async () => {
      const response = await fetch(`/api/saved-jobs/${jobId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setStatus(body.error ?? "Unable to remove saved job.")
        return
      }

      setSavedJobs((current) => current.filter((job) => job.jobId !== jobId))
      setStatus("Saved job removed.")
    })
  }

  if (savedJobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-white p-8 text-center">
        <h2 className="text-xl font-semibold text-slate-900">No saved jobs yet</h2>
        <p className="mt-2 text-slate-600">Save individual jobs from the board or a job detail page to track them here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {status ? <p className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{status}</p> : null}
      {savedJobs.map((savedJob) => (
        <article key={savedJob.id} className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">
                <Link href={`/jobs/${savedJob.jobSlug}`} className="underline underline-offset-4">
                  {savedJob.jobTitle}
                </Link>
              </h2>
              <p className="text-sm font-medium text-slate-700">{savedJob.jobCompanyName ?? "Local employer"}</p>
              <p className="text-sm text-slate-600">{savedJob.jobLocation ?? "Salem, OR"}</p>
              <p className="text-sm text-slate-600">Current status: {getStateLabel(savedJob)}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => onToggleAlerts(savedJob.jobId, !savedJob.alertsEnabled)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                {savedJob.alertsEnabled ? "Pause alerts" : "Enable alerts"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => onRemove(savedJob.jobId)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Remove
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
