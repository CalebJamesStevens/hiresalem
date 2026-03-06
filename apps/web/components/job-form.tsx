"use client"

import { useState, useTransition } from "react"

import { categoryOptions, employmentTypeOptions, salaryIntervalOptions, workModeOptions } from "@/lib/job-search"

type ApplyType = "onsite" | "external"

export function JobForm({ disabled = false }: { disabled?: boolean }) {
  const [status, setStatus] = useState<string | null>(null)
  const [applyType, setApplyType] = useState<ApplyType>("onsite")
  const [isPending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    if (disabled) {
      return
    }

    startTransition(async () => {
      setStatus("Submitting...")

      const applyType = String(formData.get("applyType") ?? "onsite") as ApplyType
      const applyUrl = String(formData.get("applyUrl") ?? "").trim()

      const payload = {
        title: String(formData.get("title") ?? ""),
        location: String(formData.get("location") ?? ""),
        salary: String(formData.get("salary") ?? ""),
        workMode: String(formData.get("workMode") ?? "") || undefined,
        employmentType: String(formData.get("employmentType") ?? "") || undefined,
        category: String(formData.get("category") ?? "") || undefined,
        salaryMin: String(formData.get("salaryMin") ?? "") || undefined,
        salaryMax: String(formData.get("salaryMax") ?? "") || undefined,
        salaryCurrency: String(formData.get("salaryCurrency") ?? "") || undefined,
        salaryInterval: String(formData.get("salaryInterval") ?? "") || undefined,
        description: String(formData.get("description") ?? ""),
        applyType,
        applyUrl: applyType === "external" ? applyUrl : undefined,
        website: String(formData.get("website") ?? "")
      }

      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setStatus("Job posted.")
        return
      }

      const body = (await response.json().catch(() => ({}))) as { error?: string }
      setStatus(body.error ?? "Failed to post job.")
    })
  }

  return (
    <form action={onSubmit} className="space-y-4 rounded-lg border bg-white p-5">
      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium">
          Job title
        </label>
        <input id="title" name="title" required disabled={disabled} className="w-full rounded border px-3 py-2" />
      </div>

      <div className="space-y-1">
        <label htmlFor="location" className="text-sm font-medium">
          Location
        </label>
        <input id="location" name="location" disabled={disabled} className="w-full rounded border px-3 py-2" />
      </div>

      <div className="space-y-1">
        <label htmlFor="salary" className="text-sm font-medium">
          Salary summary
        </label>
        <input id="salary" name="salary" disabled={disabled} className="w-full rounded border px-3 py-2" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="workMode" className="text-sm font-medium">
            Work mode
          </label>
          <select id="workMode" name="workMode" disabled={disabled} className="w-full rounded border px-3 py-2">
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
          <select id="employmentType" name="employmentType" disabled={disabled} className="w-full rounded border px-3 py-2">
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
          <select id="category" name="category" disabled={disabled} className="w-full rounded border px-3 py-2">
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
          <input id="salaryMin" name="salaryMin" type="number" min="1" disabled={disabled} className="w-full rounded border px-3 py-2" />
        </div>

        <div className="space-y-1">
          <label htmlFor="salaryMax" className="text-sm font-medium">
            Salary max
          </label>
          <input id="salaryMax" name="salaryMax" type="number" min="1" disabled={disabled} className="w-full rounded border px-3 py-2" />
        </div>

        <div className="space-y-1">
          <label htmlFor="salaryCurrency" className="text-sm font-medium">
            Currency
          </label>
          <input
            id="salaryCurrency"
            name="salaryCurrency"
            defaultValue="USD"
            maxLength={3}
            disabled={disabled}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="salaryInterval" className="text-sm font-medium">
            Salary interval
          </label>
          <select id="salaryInterval" name="salaryInterval" disabled={disabled} className="w-full rounded border px-3 py-2">
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
        <textarea id="description" name="description" rows={6} disabled={disabled} className="w-full rounded border px-3 py-2" />
      </div>

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
          <input id="applyUrl" name="applyUrl" type="url" required disabled={disabled} className="w-full rounded border px-3 py-2" />
        </div>
      ) : null}

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        disabled={disabled}
        className="hidden"
        aria-hidden="true"
      />

      <button
        type="submit"
        disabled={disabled || isPending}
        className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
      >
        {disabled ? "Complete business setup first" : isPending ? "Submitting..." : "Submit"}
      </button>

      {status ? <p className="text-sm text-slate-600">{status}</p> : null}
    </form>
  )
}
