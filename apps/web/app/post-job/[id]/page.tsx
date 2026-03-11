import Link from "next/link"
import { redirect } from "next/navigation"

import { JobForm } from "@/components/job-form"
import { hasRole } from "@/lib/authz"
import { getCompanyById, listCompanies } from "@/lib/companies"
import { getJobById } from "@/lib/jobs"
import { requirePageRoles } from "@/lib/page-auth"

type EditJobPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EditJobPage({ params }: EditJobPageProps) {
  const { id } = await params
  const user = await requirePageRoles(["business", "admin"], `/post-job/${id}`)
  const isAdmin = hasRole(user.roles, "admin")
  const [job, existingCompanies] = await Promise.all([getJobById(id), isAdmin ? listCompanies() : Promise.resolve([])])

  if (!job) {
    redirect("/dashboard/jobs")
  }

  if (!isAdmin && job.ownerAuthId !== user.id) {
    redirect("/dashboard/jobs")
  }

  const company = job.companyId ? await getCompanyById(job.companyId) : null

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Edit job</h1>
        <p className="text-sm text-slate-600">Update the listing content, preview it, then save changes.</p>
        <p className="text-sm text-slate-600">
          <Link href={`/jobs/${job.slug}`} className="underline underline-offset-4">
            View current job page
          </Link>
        </p>
      </div>

      <JobForm
        disabled={false}
        requiresPayment={false}
        isAdmin={isAdmin}
        existingCompanies={existingCompanies}
        postingCompanyName={company?.name ?? null}
        initialValues={{
          id: job.id,
          slug: job.slug,
          title: job.title,
          location: job.location,
          streetAddress: job.streetAddress,
          postalCode: job.postalCode,
          salary: job.salary,
          workMode: job.workMode,
          employmentType: job.employmentType,
          category: job.category,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency,
          salaryInterval: job.salaryInterval,
          description: job.description,
          applyType: job.applyType,
          applyUrl: job.applyUrl,
          listingDurationDays: job.listingDurationDays,
          companyId: job.companyId
        }}
      />
    </section>
  )
}
