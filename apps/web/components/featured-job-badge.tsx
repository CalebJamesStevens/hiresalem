export function FeaturedJobBadge({
  inactive = false
}: {
  inactive?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] ${
        inactive
          ? "border border-slate-200 bg-slate-100 text-slate-600"
          : "bg-indigo-600 text-white"
      }`}
    >
      {inactive ? "Featured saved" : "Featured job"}
    </span>
  )
}
