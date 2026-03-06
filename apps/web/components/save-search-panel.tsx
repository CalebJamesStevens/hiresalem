"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import { trackAnalyticsEvent } from "@/lib/analytics"

type SaveSearchPanelProps = {
  currentPath: string
}

type SaveState =
  | {
      tone: "success" | "error" | "info"
      message: string
    }
  | null

function getStatusClassName(tone: NonNullable<SaveState>["tone"]) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800"
  }

  if (tone === "error") {
    return "border-rose-200 bg-rose-50 text-rose-800"
  }

  return "border-slate-200 bg-slate-50 text-slate-700"
}

export function SaveSearchPanel({ currentPath }: SaveSearchPanelProps) {
  const [state, setState] = useState<SaveState>(null)
  const [isPending, startTransition] = useTransition()
  const [alertsEnabled, setAlertsEnabled] = useState(false)
  const [name, setName] = useState("My Salem job search")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [showSignin, setShowSignin] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowSignin(false)

    startTransition(async () => {
      setState({ tone: "info", message: "Saving your search..." })

      const response = await fetch("/api/saved-searches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          queryString: currentPath,
          recipientEmail,
          alertsEnabled
        })
      })

      if (response.status === 401) {
        setShowSignin(true)
        setState({
          tone: "error",
          message: "Sign in to save this search and optionally turn on daily email alerts."
        })
        return
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setState({
          tone: "error",
          message: body.error ?? "Failed to save this search."
        })
        return
      }

      trackAnalyticsEvent("saved_search_created")
      if (alertsEnabled) {
        trackAnalyticsEvent("saved_search_alert_enabled")
      }

      setState({
        tone: "success",
        message: alertsEnabled
          ? "Search saved. Daily email alerts are enabled for new matching jobs."
          : "Search saved. You can reopen it anytime from your dashboard."
      })
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex-1 space-y-1">
          <span className="text-sm font-medium text-slate-700">Save this search</span>
          <input
            name="name"
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border px-3 py-2"
          />
        </label>
        <button type="submit" disabled={isPending} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {isPending ? "Saving..." : "Save search"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={alertsEnabled}
            onChange={(event) => setAlertsEnabled(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium text-slate-800">Email me new matching jobs daily</span>
            <span className="block text-sm text-slate-600">Turn this saved search into a daily digest so fresh Salem-area matches land in your inbox.</span>
          </span>
        </label>

        {alertsEnabled ? (
          <label className="mt-3 block space-y-1">
            <span className="text-sm font-medium text-slate-700">Alert email</span>
            <input
              type="email"
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border px-3 py-2"
            />
          </label>
        ) : null}
      </div>

      {state ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${getStatusClassName(state.tone)}`}>
          <p>{state.message}</p>
          {state.tone === "success" ? (
            <p className="mt-2">
              <Link href="/dashboard/saved-searches" className="font-medium underline">
                Manage saved searches
              </Link>
            </p>
          ) : null}
          {showSignin ? (
            <p className="mt-2">
              <Link href={`/signin?callbackUrl=${encodeURIComponent(currentPath)}`} className="font-medium underline">
                Sign in
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  )
}
