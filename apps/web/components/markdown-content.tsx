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

  return <div className="space-y-4" dangerouslySetInnerHTML={{ __html: html }} />
}
