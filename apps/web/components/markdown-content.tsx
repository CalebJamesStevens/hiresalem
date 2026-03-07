import { jobDescriptionToHtml } from "@/lib/markdown"

export function MarkdownContent({
  value,
  fallback
}: {
  value: string | null | undefined
  fallback?: string
}) {
  const html = jobDescriptionToHtml(value)

  if (!html) {
    return fallback ? <p className="text-slate-700 leading-7">{fallback}</p> : null
  }

  return (
    <div
      className="min-w-0 space-y-4 [&_a]:break-all [&_blockquote]:overflow-x-auto [&_code]:break-all [&_h1]:break-words [&_h2]:break-words [&_h3]:break-words [&_li]:break-words [&_p]:break-words [&_pre]:max-w-full [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
