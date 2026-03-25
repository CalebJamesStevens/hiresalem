import { redirect } from "next/navigation"

import { normalizeRoles } from "@/lib/authz"
import { getCompanyByOwnerAuthId } from "@/lib/companies"
import { getEmployerExistingAccountHref, getEmployerSelfServePlan, getEmployerStartHref } from "@/lib/employer-self-serve"
import { getSessionSafe } from "@/lib/session"

type EmployerStartPageProps = {
  searchParams: Promise<{
    plan?: string
  }>
}

export default async function EmployerStartPage({ searchParams }: EmployerStartPageProps) {
  const params = await searchParams
  const selectedPlan = getEmployerSelfServePlan(params.plan)
  const session = await getSessionSafe()
  const userId = session?.user?.id
  const roles = normalizeRoles(session?.user?.roles)

  if (!userId) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(getEmployerStartHref(selectedPlan))}`)
  }

  const existingCompany = await getCompanyByOwnerAuthId(userId)

  if (!existingCompany || (!roles.includes("business") && !roles.includes("admin"))) {
    redirect(`/become-business?plan=${selectedPlan}`)
  }

  redirect(getEmployerExistingAccountHref(selectedPlan))
}
