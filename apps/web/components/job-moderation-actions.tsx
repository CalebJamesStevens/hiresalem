"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import type { EmployerJobLifecycleStatus } from "@/lib/job-listing-billing"

export function JobModerationActions({
  jobId,
  jobStatus,
  isFeatured = false,
  canActivate = true,
  canToggleFeatured = false,
  canDelete = true
}: {
  jobId: string
  jobStatus: EmployerJobLifecycleStatus
  isFeatured?: boolean
  canActivate?: boolean
  canToggleFeatured?: boolean
  canDelete?: boolean
}) {
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isActive = jobStatus === "live"
  const activationLabel = jobStatus === "draft" ? "Publish" : jobStatus === "closed" ? "Reopen" : jobStatus === "live" ? "Close" : "Unavailable"

  function toggleActive() {
    startTransition(async () => {
      setStatus("Updating...")

      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setStatus(body.error ?? "Update failed")
        return
      }

      setStatus(isActive ? "Marked as closed" : jobStatus === "draft" ? "Published" : "Reopened")
      router.refresh()
    })
  }

  function deleteJob() {
    startTransition(async () => {
      setStatus("Deleting...")

      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setStatus(body.error ?? "Delete failed")
        return
      }

      setStatus("Deleted")
      router.refresh()
    })
  }

  function toggleFeatured() {
    startTransition(async () => {
      setStatus(isFeatured ? "Removing featured placement..." : "Adding featured placement...")

      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !isFeatured })
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setStatus(body.error ?? "Update failed")
        return
      }

      setStatus(isFeatured ? "Featured placement removed" : "Job marked as featured")
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={`/post-job/${jobId}`} className="rounded border px-3 py-1 text-xs font-medium">
        Edit
      </Link>

      <button
        type="button"
        onClick={toggleActive}
        disabled={isPending || (!isActive && !canActivate)}
        className="rounded border px-3 py-1 text-xs font-medium"
      >
        {isActive ? "Close" : canActivate ? activationLabel : "Unavailable"}
      </button>

      {isFeatured || canToggleFeatured ? (
        <button type="button" onClick={toggleFeatured} disabled={isPending} className="rounded border px-3 py-1 text-xs font-medium">
          {isFeatured ? "Remove featured" : "Feature job"}
        </button>
      ) : null}

      {canDelete ? (
        <button
          type="button"
          onClick={deleteJob}
          disabled={isPending}
          className="rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-700"
        >
          Delete
        </button>
      ) : null}

      {status ? <span className="text-xs text-slate-500">{status}</span> : null}
    </div>
  )
}
