import Link from "next/link"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-3 text-sm">
        <Link href="/admin/jobs" className="rounded border bg-white px-3 py-2">
          Jobs
        </Link>
        <Link href="/admin/applications" className="rounded border bg-white px-3 py-2">
          Applications
        </Link>
        <Link href="/admin/seo" className="rounded border bg-white px-3 py-2">
          SEO
        </Link>
      </nav>
      {children}
    </div>
  )
}
