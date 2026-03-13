"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"

type SaveJobButtonProps = {
  jobId: string
  initialSaved?: boolean
  className?: string
}

export function SaveJobButton({ jobId, initialSaved = false, className }: SaveJobButtonProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isSaved, setIsSaved] = useState(initialSaved)
  const [message, setMessage] = useState<string | null>(null)
  const [requiresSignin, setRequiresSignin] = useState(false)
  const [isPending, startTransition] = useTransition()
  const callbackUrl = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`

  function onClick() {
    startTransition(async () => {
      setRequiresSignin(false)
      setMessage(null)

      const response = await fetch(isSaved ? `/api/saved-jobs/${jobId}` : "/api/saved-jobs", {
        method: isSaved ? "DELETE" : "POST",
        headers: isSaved
          ? undefined
          : {
              "Content-Type": "application/json"
            },
        body: isSaved ? undefined : JSON.stringify({ jobId })
      })

      if (response.status === 401) {
        setRequiresSignin(true)
        setMessage("Sign in to save jobs and get status alerts.")
        return
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setMessage(body.error ?? "Unable to update saved jobs.")
        return
      }

      setIsSaved((current) => !current)
      setMessage(isSaved ? "Job removed from saved jobs." : "Job saved. Status alerts are on.")
    })
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className={className ?? "rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"}
      >
        {isPending ? "Saving..." : isSaved ? "Saved" : "Save job"}
      </button>
      {message ? (
        <p className="text-xs text-slate-600">
          {message}{" "}
          {requiresSignin ? (
            <Link href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium underline">
              Sign in
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}
