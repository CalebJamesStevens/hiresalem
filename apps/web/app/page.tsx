import Link from "next/link"

export default function HomePage() {
  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">Local jobs in Salem, Oregon</h1>
      <p className="max-w-2xl text-slate-600">
        HireSalem is a fast, local-first board for companies hiring in and around Salem.
      </p>
      <div className="flex gap-3">
        <Link href="/jobs" className="rounded bg-slate-900 px-4 py-2 text-white">
          Browse jobs
        </Link>
        <Link href="/post-job" className="rounded border border-slate-300 px-4 py-2">
          Post a job
        </Link>
      </div>
    </section>
  )
}
