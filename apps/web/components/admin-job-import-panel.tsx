"use client"

import { useState, useTransition } from "react"

type ImportSummary = {
  dryRun: boolean
  insertedCompanies: number
  updatedCompanies: number
  insertedJobs: number
  updatedJobs: number
  skippedJobs: Array<{
    slug: string
    title: string
    reasons: string[]
  }>
}

function formatFileSize(bytes: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: bytes >= 1024 * 1024 ? 1 : 0
  }).format(bytes >= 1024 * 1024 ? bytes / (1024 * 1024) : bytes / 1024)
}

export function AdminJobImportPanel() {
  const [file, setFile] = useState<File | null>(null)
  const [dryRun, setDryRun] = useState(true)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [isPending, startTransition] = useTransition()

  function onFileSelect(nextFile: File | null) {
    setFile(nextFile)
    setStatus(null)
    setError(null)
    setSummary(null)
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!file) {
      setError("Choose a JSON file to import.")
      setStatus(null)
      return
    }

    startTransition(async () => {
      setError(null)
      setSummary(null)
      setStatus(dryRun ? "Running dry run..." : "Importing jobs...")

      const formData = new FormData()
      formData.set("file", file)
      formData.set("dryRun", String(dryRun))

      const response = await fetch("/api/admin/jobs/import", {
        method: "POST",
        body: formData
      })

      const body = (await response.json().catch(() => ({}))) as ImportSummary & { error?: string }
      if (!response.ok) {
        setStatus(null)
        setError(body.error ?? "Import failed.")
        return
      }

      setSummary({
        dryRun: body.dryRun,
        insertedCompanies: body.insertedCompanies,
        updatedCompanies: body.updatedCompanies,
        insertedJobs: body.insertedJobs,
        updatedJobs: body.updatedJobs,
        skippedJobs: body.skippedJobs ?? []
      })
      setStatus(body.dryRun ? "Dry run completed." : "Import completed.")
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950">Upload normalized jobs JSON</h2>
          <p className="text-sm text-slate-600">
            Accepts the batch shape with top-level <code>companies</code> and <code>jobs</code> arrays. Dry run stays on by default so you can verify counts before writing.
          </p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <label
            htmlFor="job-import-file"
            className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-slate-400 hover:bg-slate-100"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              onFileSelect(event.dataTransfer.files.item(0))
            }}
          >
            <span className="text-sm font-semibold text-slate-900">Drop a JSON file here or click to browse</span>
            <span className="mt-2 text-sm text-slate-600">Only one file at a time. Max payload size is 10 MB.</span>
            {file ? (
              <span className="mt-4 rounded-full bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
                {file.name} • {formatFileSize(file.size)}
                {file.size >= 1024 * 1024 ? " MB" : " KB"}
              </span>
            ) : null}
          </label>

          <input
            id="job-import-file"
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => onFileSelect(event.target.files?.item(0) ?? null)}
          />

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(event) => setDryRun(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span>
              Dry run only. Validate and report insert/update counts without writing to the database.
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isPending || !file}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isPending ? "Working..." : dryRun ? "Run dry run" : "Import jobs"}
            </button>
            {status ? <p className="text-sm text-slate-600">{status}</p> : null}
          </div>
        </form>
      </section>

      {error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 shadow-sm">
          <p className="font-semibold">Import failed</p>
          <p className="mt-1">{error}</p>
        </section>
      ) : null}

      {summary ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">{summary.dryRun ? "Dry run summary" : "Import summary"}</h2>
            <p className="text-sm text-slate-600">
              {summary.dryRun ? "No database writes were committed." : "The batch has been applied to the database."}
            </p>
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <dt className="text-sm text-slate-500">Companies inserted</dt>
              <dd className="mt-2 text-2xl font-semibold text-slate-950">{summary.insertedCompanies}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <dt className="text-sm text-slate-500">Companies updated</dt>
              <dd className="mt-2 text-2xl font-semibold text-slate-950">{summary.updatedCompanies}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <dt className="text-sm text-slate-500">Jobs inserted</dt>
              <dd className="mt-2 text-2xl font-semibold text-slate-950">{summary.insertedJobs}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <dt className="text-sm text-slate-500">Jobs updated</dt>
              <dd className="mt-2 text-2xl font-semibold text-slate-950">{summary.updatedJobs}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <dt className="text-sm text-slate-500">Jobs skipped</dt>
              <dd className="mt-2 text-2xl font-semibold text-slate-950">{summary.skippedJobs.length}</dd>
            </div>
          </dl>

          {summary.skippedJobs.length > 0 ? (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Skipped jobs</h3>
              {summary.skippedJobs.map((job) => (
                <article key={job.slug} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-medium">
                    {job.title} <span className="font-normal text-amber-800">({job.slug})</span>
                  </p>
                  <p className="mt-1">{job.reasons.join(" ")}</p>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
