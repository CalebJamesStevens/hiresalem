import Link from "next/link"

import { cn } from "@/lib/utils"

export function SiteBrand({
  href = "/",
  className,
  iconClassName,
  labelClassName,
  label = "HireSalem"
}: {
  href?: string
  className?: string
  iconClassName?: string
  labelClassName?: string
  label?: string
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3", className)} aria-label={label}>
      <img
        src="/brand/HireSalemLogo.svg"
        alt=""
        aria-hidden="true"
        className={cn("h-10 w-10 shrink-0 rounded-full", iconClassName)}
      />
      <span className={cn("text-base font-semibold tracking-[0.08em] text-slate-950", labelClassName)}>{label}</span>
    </Link>
  )
}
