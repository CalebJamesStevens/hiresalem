"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { applicantStageOptions, getApplicationStageLabel, type ApplicationStage } from "@/lib/applicant-inbox"

type ApplicantWorkflowPanelProps = {
  applicationId: string
  stage: ApplicationStage
  internalNotes: string | null
  nextStepAt: Date | string | null
  nextStepNote: string | null
  lastContactedAt: Date | string | null
}

function formatDateTimeInputValue(value: Date | string | null) {
  if (!value) {
    return ""
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function formatDateTimeLabel(value: Date | string | null) {
  if (!value) {
    return "Not logged yet"
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Not logged yet"
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date)
}

export function ApplicantWorkflowPanel({
  applicationId,
  stage,
  internalNotes,
  nextStepAt,
  nextStepNote,
  lastContactedAt
}: ApplicantWorkflowPanelProps) {
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function saveWorkflow(formData: FormData) {
    startTransition(async () => {
      setStatus("Saving workflow...")

      const nextStepAtValue = formData.get("nextStepAt")
      const payload = {
        stage: formData.get("stage"),
        internalNotes: formData.get("internalNotes"),
        nextStepNote: formData.get("nextStepNote"),
        nextStepAt:
          typeof nextStepAtValue === "string" && nextStepAtValue
            ? new Date(nextStepAtValue).toISOString()
            : null
      }

      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setStatus(body.error ?? "Workflow update failed")
        return
      }

      setStatus("Workflow saved")
      router.refresh()
    })
  }

  function markContactedNow() {
    startTransition(async () => {
      setStatus("Logging contact...")

      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastContactedAt: new Date().toISOString() })
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setStatus(body.error ?? "Contact update failed")
        return
      }

      setStatus("Contact logged")
      router.refresh()
    })
  }

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Workflow</p>
        <h2 className="text-xl font-semibold text-slate-950">{getApplicationStageLabel(stage)}</h2>
      </div>

      <form action={saveWorkflow} className="space-y-4">
        <fieldset disabled={isPending} className="space-y-4 disabled:opacity-70">
          <div className="space-y-1.5">
            <label htmlFor="stage" className="text-sm font-medium text-slate-800">
              Stage
            </label>
            <select
              id="stage"
              name="stage"
              defaultValue={stage}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900"
            >
              {applicantStageOptions
                .filter((option) => option.value !== "any")
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="nextStepAt" className="text-sm font-medium text-slate-800">
              Next step date
            </label>
            <input
              id="nextStepAt"
              name="nextStepAt"
              type="datetime-local"
              defaultValue={formatDateTimeInputValue(nextStepAt)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="nextStepNote" className="text-sm font-medium text-slate-800">
              Next step note
            </label>
            <textarea
              id="nextStepNote"
              name="nextStepNote"
              rows={3}
              defaultValue={nextStepNote ?? ""}
              placeholder="Schedule interview, request references, or capture the next action."
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="internalNotes" className="text-sm font-medium text-slate-800">
              Internal notes
            </label>
            <textarea
              id="internalNotes"
              name="internalNotes"
              rows={6}
              defaultValue={internalNotes ?? ""}
              placeholder="Private interview notes, follow-up reminders, or salary guidance."
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save workflow"}
            </button>
            <button
              type="button"
              onClick={markContactedNow}
              disabled={isPending}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-60"
            >
              Mark contacted now
            </button>
            {status ? <p className="text-sm text-slate-600">{status}</p> : null}
          </div>
        </fieldset>
      </form>

      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p>Last contacted: {formatDateTimeLabel(lastContactedAt)}</p>
      </div>
    </div>
  )
}
