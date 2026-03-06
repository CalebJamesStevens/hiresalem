import Link from "next/link"

type Breadcrumb = {
  name: string
  href: string
}

export function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.href}-${item.name}`} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            <Link href={item.href} className="hover:text-slate-900">
              {item.name}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}
