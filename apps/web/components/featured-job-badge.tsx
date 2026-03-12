export function FeaturedJobBadge({
  inactive = false
}: {
  inactive?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
        inactive ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-900"
      }`}
    >
      {inactive ? "Featured saved" : "Featured job"}
    </span>
  )
}
