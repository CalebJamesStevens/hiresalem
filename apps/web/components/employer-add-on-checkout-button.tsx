type EmployerAddOnCheckoutButtonProps = {
  addOnId: "extra_slot" | "weekly_feature" | "social_shoutout"
  label: string
  jobId?: string | null
  className?: string
}

export function EmployerAddOnCheckoutButton({ addOnId, label, jobId = null, className }: EmployerAddOnCheckoutButtonProps) {
  return (
    <form action="/api/billing/add-ons/checkout" method="post">
      <input type="hidden" name="addOnId" value={addOnId} />
      {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}
      <button type="submit" className={className ?? "rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"}>
        {label}
      </button>
    </form>
  )
}
