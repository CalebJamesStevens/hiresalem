"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import { trackAnalyticsEvent } from "@/lib/analytics"
import type { SavedSearch } from "@/lib/saved-searches"

type SavedSearchManagerProps = {
  initialSavedSearches: SavedSearch[]
  defaultRecipientEmail?: string | null
}

export function SavedSearchManager({ initialSavedSearches, defaultRecipientEmail }: SavedSearchManagerProps) {
  const [savedSearches, setSavedSearches] = useState(initialSavedSearches)
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>(
    Object.fromEntries(initialSavedSearches.map((savedSearch) => [savedSearch.id, savedSearch.recipientEmail ?? defaultRecipientEmail ?? ""]))
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateLocalSearch(id: string, updates: Partial<SavedSearch>) {
    setSavedSearches((current) => current.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  function removeLocalSearch(id: string) {
    setSavedSearches((current) => current.filter((item) => item.id !== id))
  }

  async function deleteSearch(id: string) {
    startTransition(async () => {
      setStatusMessage(null)
      const response = await fetch(`/api/saved-searches/${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        removeLocalSearch(id)
        setStatusMessage("Saved search deleted.")
      }
    })
  }

  async function updateAlerts(id: string, alertsEnabled: boolean, recipientEmail: string) {
    startTransition(async () => {
      setStatusMessage(null)
      const response = await fetch(`/api/saved-searches/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          alertsEnabled,
          recipientEmail
        })
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setStatusMessage(body.error ?? "Failed to update this saved search.")
        return
      }

      const updated = (await response.json()) as SavedSearch
      updateLocalSearch(id, updated)
      setEmailDrafts((current) => ({
        ...current,
        [id]: updated.recipientEmail ?? ""
      }))
      if (updated.alertsEnabled) {
        trackAnalyticsEvent("saved_search_alert_enabled")
      }
      setStatusMessage(updated.alertsEnabled ? "Daily alerts updated." : "Daily alerts turned off.")
    })
  }

  if (savedSearches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-white p-8 text-center">
        <h2 className="text-xl font-semibold">No saved searches yet</h2>
        <p className="mt-2 text-slate-600">Save a search from the public jobs page to keep its current filters and optionally enable daily alerts.</p>
        <Link href="/jobs" className="mt-4 inline-block rounded-xl border px-4 py-2 font-medium">
          Browse jobs
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {statusMessage ? <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{statusMessage}</p> : null}
      {savedSearches.map((savedSearch) => (
        <article key={savedSearch.id} className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{savedSearch.name}</h2>
              <p className="text-sm text-slate-600">{savedSearch.queryString}</p>
            </div>

            <div className="flex gap-3">
              <Link href={savedSearch.queryString} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                Open search
              </Link>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  void deleteSearch(savedSearch.id)
                }}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <label className="flex-1">
                <span className="text-sm font-medium text-slate-700">Alert email</span>
                <input
                  value={emailDrafts[savedSearch.id] ?? ""}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setEmailDrafts((current) => ({
                      ...current,
                      [savedSearch.id]: nextValue
                    }))
                  }}
                  onBlur={(event) => {
                    const nextEmail = event.target.value.trim()
                    if (nextEmail !== (savedSearch.recipientEmail ?? "")) {
                      void updateAlerts(savedSearch.id, savedSearch.alertsEnabled, nextEmail)
                    }
                  }}
                  type="email"
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </label>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const recipientEmail = (emailDrafts[savedSearch.id] ?? "").trim()

                  if (!savedSearch.alertsEnabled && recipientEmail.length === 0) {
                    setStatusMessage("Enter an alert email before enabling daily alerts.")
                    return
                  }

                  void updateAlerts(savedSearch.id, !savedSearch.alertsEnabled, recipientEmail)
                }}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${savedSearch.alertsEnabled ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"}`}
              >
                {savedSearch.alertsEnabled ? "Daily alerts on" : "Enable daily alerts"}
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">When enabled, HireSalem will send one daily email if new jobs match this search.</p>
          </div>
        </article>
      ))}
    </div>
  )
}
