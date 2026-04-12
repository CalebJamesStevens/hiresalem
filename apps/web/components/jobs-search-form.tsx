"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import {
  applyTypeOptions,
  categoryOptions,
  employmentTypeOptions,
  postedWithinOptions,
  sortOptions,
  workModeOptions,
  type JobsSearchParams
} from "@/lib/job-search"

function getActiveMobileFilterCount(params: JobsSearchParams) {
  let count = 0

  if (params.workMode !== "any") {
    count += 1
  }

  if (params.employmentType !== "any") {
    count += 1
  }

  if (params.category !== "any") {
    count += 1
  }

  if (params.applyType !== "any") {
    count += 1
  }

  if (params.postedWithin !== "any") {
    count += 1
  }

  if (params.minSalary) {
    count += 1
  }

  return count
}

export function JobsSearchForm({ params }: { params: JobsSearchParams }) {
  const mobileFilterCount = getActiveMobileFilterCount(params)
  const hasAnySecondaryControls = mobileFilterCount > 0 || params.sort !== (params.q ? "relevance" : "newest")
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const filtersRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isFiltersOpen) {
      return
    }

    function onPointerDown(event: MouseEvent) {
      if (!filtersRef.current?.contains(event.target as Node)) {
        setIsFiltersOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFiltersOpen(false)
      }
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [isFiltersOpen])

  return (
    <form action="/jobs" method="get" className="min-w-0 max-w-full space-y-2 rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-1">
          <label htmlFor="q" className="sr-only">
            Keywords
          </label>
          <input
            id="q"
            name="q"
            defaultValue={params.q}
            placeholder="Job title, company, or skill"
            className="min-h-12 w-full rounded-full border px-4 py-2"
          />
        </div>

        <div className="min-w-0 space-y-1">
          <label htmlFor="location" className="sr-only">
            Location
          </label>
          <input
            id="location"
            name="location"
            defaultValue={params.location}
            placeholder="Salem, Keizer, Remote"
            className="min-h-12 w-full rounded-full border px-4 py-2"
          />
        </div>

        <div className="flex w-full items-end gap-2 md:w-auto">
          <button type="submit" className="min-h-12 w-full rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white md:w-auto">
            Search jobs
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 overflow-visible pb-1">
        <div ref={filtersRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsFiltersOpen((current) => !current)}
            className="flex min-h-10 items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800"
            aria-expanded={isFiltersOpen}
            aria-haspopup="dialog"
          >
            <span>Filters</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {mobileFilterCount > 0 ? mobileFilterCount : "All"}
            </span>
          </button>

          {isFiltersOpen ? (
            <div className="absolute left-0 top-full z-10 mt-2 w-[min(92vw,24rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="grid gap-3">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Work mode</span>
                  <select name="workMode" defaultValue={params.workMode} className="w-full rounded-xl border px-3 py-2">
                    {workModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Employment type</span>
                  <select name="employmentType" defaultValue={params.employmentType} className="w-full rounded-xl border px-3 py-2">
                    {employmentTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Category</span>
                  <select name="category" defaultValue={params.category} className="w-full rounded-xl border px-3 py-2">
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Apply method</span>
                  <select name="applyType" defaultValue={params.applyType} className="w-full rounded-xl border px-3 py-2">
                    {applyTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Posted</span>
                  <select name="postedWithin" defaultValue={params.postedWithin} className="w-full rounded-xl border px-3 py-2">
                    {postedWithinOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Minimum salary</span>
                  <input
                    name="minSalary"
                    type="number"
                    min="1"
                    defaultValue={params.minSalary ?? ""}
                    placeholder="80000"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </label>

                <div className="flex items-center gap-2 pt-1">
                  <button type="submit" className="min-h-10 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                    Apply filters
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFiltersOpen(false)}
                    className="rounded-full border px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    Close
                  </button>
                  {hasAnySecondaryControls ? (
                    <Link href="/jobs" className="rounded-full border px-4 py-2 text-sm font-medium text-slate-700">
                      Reset
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <label className="min-w-0 shrink-0">
          <span className="sr-only">Sort</span>
          <select name="sort" defaultValue={params.sort} className="max-w-full min-h-10 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800">
            {sortOptions
              .filter((option) => params.q || option.value !== "relevance")
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
        </label>

        {hasAnySecondaryControls ? (
          <Link href="/jobs" className="shrink-0 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
            Clear all
          </Link>
        ) : null}
      </div>
    </form>
  )
}
