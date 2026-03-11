export function JsonLd({ data }: { data: unknown }) {
  if (data == null) {
    return null
  }

  if (Array.isArray(data) && data.length === 0) {
    return null
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}
