import Link from "next/link"
import { redirect } from "next/navigation"

import { CompanyLogoField } from "@/components/company-logo-field"
import { EmployerPlanSummaryCard } from "@/components/employer-plan-summary-card"
import { LockedPlanFeatureCard } from "@/components/locked-plan-feature-card"
import { hasRole } from "@/lib/authz"
import {
  deleteStoredCompanyImage,
  getCompanyImageSrc,
  isStoredCompanyImageKey,
  uploadCompanyImageFile,
  validateCompanyImageFile
} from "@/lib/company-image-storage"
import { companyProfileLockedFeatureIds, getLockedCompanyFeatures } from "@/lib/company-plan-ui"
import {
  canManageCompanyProfile,
  companySocialLinkFields,
  COMPANY_ENHANCED_TEXT_MAX_LENGTH,
  COMPANY_LOCATION_MAX_LENGTH,
  COMPANY_MEDIA_URL_MAX_LENGTH,
  COMPANY_NAME_MAX_LENGTH,
  COMPANY_SHORT_DESCRIPTION_MAX_LENGTH,
  COMPANY_WEBSITE_MAX_LENGTH,
  getCompanyById,
  getCompanyByOwnerAuthId,
  getCompanyProfileValidationErrorCode,
  listCompanies,
  parseCompanyProfileInputForPlan,
  updateCompanyProfile
} from "@/lib/companies"
import { requirePageRoles } from "@/lib/page-auth"
import { resolveCompanyPlan } from "@repo/db/plans"

type DashboardCompanyPageProps = {
  searchParams: Promise<{
    companyId?: string
    updated?: string
    welcome?: string
    error?: string
  }>
}

function getErrorMessage(error?: string) {
  if (error === "company_not_found") {
    return "Company not found."
  }

  if (error === "company_name_length") {
    return "Business name must be between 2 and 80 characters."
  }

  if (error === "invalid_website") {
    return "Website must be a valid URL."
  }

  if (error === "invalid_logo_url") {
    return "Logo must be a valid image."
  }

  if (error === "invalid_logo_file_type") {
    return "Logo must be a PNG, JPG, JPEG, or WebP image."
  }

  if (error === "logo_file_too_large") {
    return "Logo must be 2 MB or smaller."
  }

  if (error === "logo_upload_failed") {
    return "Logo upload failed. Please try again."
  }

  if (error === "short_description_length") {
    return "Short description must be 280 characters or fewer."
  }

  if (error === "company_location_length") {
    return "Location must be 120 characters or fewer."
  }

  if (error === "invalid_linkedin_url" || error === "invalid_facebook_url" || error === "invalid_instagram_url") {
    return "Social links must be valid URLs."
  }

  if (error === "about_section_length" || error === "why_work_here_length" || error === "benefits_length") {
    return "Enhanced profile sections must be 5,000 characters or fewer."
  }

  if (error === "invalid_cover_image_url" || error === "invalid_gallery_image_url") {
    return "Cover and gallery image fields must be valid URLs."
  }

  if (error === "plan_locked_social_links") {
    return "Social links are available on Standard or Partner."
  }

  if (error === "plan_locked_enhanced_company_profile") {
    return "Expanded about, why work here, and benefits sections are available on Standard or Partner."
  }

  if (error === "plan_locked_company_media") {
    return "Cover images and gallery media are available on Standard or Partner."
  }

  if (error === "forbidden") {
    return "You do not have permission to edit that company."
  }

  if (error === "invalid_company_profile") {
    return "Unable to save the company profile. Check the fields and try again."
  }

  return null
}

export const dynamic = "force-dynamic"

export default async function DashboardCompanyPage({ searchParams }: DashboardCompanyPageProps) {
  const params = await searchParams
  const user = await requirePageRoles(["business", "admin"], "/dashboard/company")
  const isAdmin = hasRole(user.roles, "admin")
  const [ownedCompany, companyOptions] = await Promise.all([getCompanyByOwnerAuthId(user.id), isAdmin ? listCompanies() : Promise.resolve([])])

  const selectedCompanyId = isAdmin ? params.companyId?.trim() || ownedCompany?.id || companyOptions[0]?.id || null : ownedCompany?.id ?? null
  const editableCompany = selectedCompanyId ? await getCompanyById(selectedCompanyId) : null
  const resolvedPlan = editableCompany ? resolveCompanyPlan(editableCompany) : null
  const lockedProfileFeatures = resolvedPlan ? getLockedCompanyFeatures(resolvedPlan, companyProfileLockedFeatureIds) : []
  const allowsSocialLinks = Boolean(resolvedPlan?.entitlements.allowsSocialLinks)
  const allowsEnhancedStory =
    Boolean(resolvedPlan?.entitlements.allowsExpandedAboutSection) &&
    Boolean(resolvedPlan?.entitlements.allowsWhyWorkHereSection) &&
    Boolean(resolvedPlan?.entitlements.allowsPerksAndBenefitsSection)
  const allowsCompanyMedia = Boolean(resolvedPlan?.entitlements.allowsCompanyMediaGallery)

  if (!isAdmin && !ownedCompany) {
    redirect("/become-business")
  }

  if (editableCompany && !canManageCompanyProfile({ id: user.id, isAdmin }, editableCompany.ownerAuthId)) {
    redirect("/dashboard/company?error=forbidden")
  }

  const message = getErrorMessage(params.error)

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Company profile</h1>
        <p className="text-slate-600">Manage the business page job seekers see alongside your HireSalem openings.</p>
      </div>

      {params.welcome === "1" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Business setup is complete. Your Community plan profile is live and ready to edit.
        </p>
      ) : null}

      {params.updated === "1" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Company profile updated.</p>
      ) : null}

      {message ? <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

      {isAdmin ? (
        <form action="/dashboard/company" className="rounded border bg-white p-4">
          <label htmlFor="companyId" className="block text-sm font-medium text-slate-900">
            Select company
          </label>
          <div className="mt-2 flex flex-wrap gap-3">
            <select id="companyId" name="companyId" defaultValue={selectedCompanyId ?? ""} className="min-w-[18rem] rounded border px-3 py-2">
              {companyOptions.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.slug}) - {resolveCompanyPlan(company).label}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
              Load company
            </button>
          </div>
        </form>
      ) : null}

      {!editableCompany ? (
        <p className="rounded border bg-white px-4 py-3 text-sm text-slate-600">No company selected yet.</p>
      ) : (
        <div className="space-y-6">
          {resolvedPlan ? <EmployerPlanSummaryCard plan={resolvedPlan} /> : null}

          <form
            action={async (formData) => {
              "use server"

              const user = await requirePageRoles(["business", "admin"], "/dashboard/company")
              const isAdmin = hasRole(user.roles, "admin")
              const companyId = String(formData.get("companyId") ?? "").trim()

              if (!companyId) {
                redirect("/dashboard/company?error=company_not_found")
              }

              const company = await getCompanyById(companyId)

              if (!company) {
                redirect("/dashboard/company?error=company_not_found")
              }

              if (!canManageCompanyProfile({ id: user.id, isAdmin }, company.ownerAuthId)) {
                redirect("/dashboard/company?error=forbidden")
              }

              const companyPlan = resolveCompanyPlan(company)
              const logoEntry = formData.get("logo")
              const logoFile = logoEntry instanceof File ? logoEntry : null
              const logoValidation = validateCompanyImageFile(logoFile)

              if (!logoValidation.ok) {
                redirect(`/dashboard/company?companyId=${company.id}&error=${logoValidation.errorCode}`)
              }

              const removeLogo = formData.get("removeLogo") === "on"
              const previousLogoUrl = company.logoUrl
              let uploadedLogoUrl: string | null = null

              try {
                if (logoValidation.file) {
                  uploadedLogoUrl = await uploadCompanyImageFile(logoValidation.file)
                }
              } catch {
                redirect(`/dashboard/company?companyId=${company.id}&error=logo_upload_failed`)
              }

              const nextLogoUrl = uploadedLogoUrl ?? (removeLogo ? null : previousLogoUrl)
              const parsed = parseCompanyProfileInputForPlan(
                {
                  name: String(formData.get("name") ?? ""),
                  logoUrl: nextLogoUrl ?? "",
                  shortDescription: String(formData.get("shortDescription") ?? ""),
                  website: String(formData.get("website") ?? ""),
                  location: String(formData.get("location") ?? ""),
                  linkedinUrl: String(formData.get("linkedinUrl") ?? ""),
                  facebookUrl: String(formData.get("facebookUrl") ?? ""),
                  instagramUrl: String(formData.get("instagramUrl") ?? ""),
                  aboutSection: String(formData.get("aboutSection") ?? ""),
                  whyWorkHere: String(formData.get("whyWorkHere") ?? ""),
                  benefits: String(formData.get("benefits") ?? ""),
                  coverImageUrl: String(formData.get("coverImageUrl") ?? ""),
                  galleryImageUrl1: String(formData.get("galleryImageUrl1") ?? ""),
                  galleryImageUrl2: String(formData.get("galleryImageUrl2") ?? "")
                },
                companyPlan
              )

              if (!parsed.success) {
                if (uploadedLogoUrl && isStoredCompanyImageKey(uploadedLogoUrl)) {
                  await deleteStoredCompanyImage(uploadedLogoUrl).catch(() => undefined)
                }
                const error = "errorCode" in parsed ? parsed.errorCode : getCompanyProfileValidationErrorCode(parsed.error)
                redirect(`/dashboard/company?companyId=${company.id}&error=${error}`)
              }

              try {
                await updateCompanyProfile({
                  id: company.id,
                  ...parsed.data
                })
              } catch (error) {
                if (uploadedLogoUrl && isStoredCompanyImageKey(uploadedLogoUrl)) {
                  await deleteStoredCompanyImage(uploadedLogoUrl).catch(() => undefined)
                }

                throw error
              }

              if (previousLogoUrl && previousLogoUrl !== parsed.data.logoUrl && isStoredCompanyImageKey(previousLogoUrl)) {
                await deleteStoredCompanyImage(previousLogoUrl).catch(() => undefined)
              }

              redirect(`/dashboard/company?companyId=${company.id}&updated=1`)
            }}
            className="space-y-6 rounded border bg-white p-6"
          >
            <input type="hidden" name="companyId" value={editableCompany.id} />

            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-950">Basic profile</h2>
                <p className="text-sm text-slate-600">These fields are included on every business page.</p>
              </div>

              <div className="space-y-1">
                <label htmlFor="name" className="text-sm font-medium">
                  Business name
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  maxLength={COMPANY_NAME_MAX_LENGTH}
                  defaultValue={editableCompany.name}
                  className="w-full rounded border px-3 py-2"
                />
              </div>

              <CompanyLogoField
                currentImageSrc={getCompanyImageSrc(editableCompany.logoUrl)}
                currentImageAlt={`${editableCompany.name} logo`}
                removeFieldName="removeLogo"
              />

              <div className="space-y-1">
                <label htmlFor="shortDescription" className="text-sm font-medium">
                  Short description
                </label>
                <textarea
                  id="shortDescription"
                  name="shortDescription"
                  rows={4}
                  maxLength={COMPANY_SHORT_DESCRIPTION_MAX_LENGTH}
                  defaultValue={editableCompany.shortDescription ?? ""}
                  placeholder="What does your business do, and what kind of work environment can candidates expect?"
                  className="w-full rounded border px-3 py-2"
                />
                <p className="text-xs text-slate-500">Keep it concise. This is the primary summary shown on your public company page.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="website" className="text-sm font-medium">
                    Company website
                  </label>
                  <input
                    id="website"
                    name="website"
                    type="url"
                    maxLength={COMPANY_WEBSITE_MAX_LENGTH}
                    defaultValue={editableCompany.website ?? ""}
                    placeholder="https://example.com"
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="location" className="text-sm font-medium">
                    City or area
                  </label>
                  <input
                    id="location"
                    name="location"
                    maxLength={COMPANY_LOCATION_MAX_LENGTH}
                    defaultValue={editableCompany.location ?? ""}
                    placeholder="Salem, OR"
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
              </div>
            </section>

            {allowsSocialLinks ? (
              <section className="space-y-4 border-t border-slate-200 pt-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-950">Social links</h2>
                  <p className="text-sm text-slate-600">Add channels that help candidates understand your brand and community presence.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {companySocialLinkFields.map((field) => (
                    <div key={field.id} className="space-y-1">
                      <label htmlFor={field.id} className="text-sm font-medium">
                        {field.label}
                      </label>
                      <input
                        id={field.id}
                        name={field.id}
                        type="url"
                        maxLength={COMPANY_WEBSITE_MAX_LENGTH}
                        defaultValue={editableCompany[field.id] ?? ""}
                        placeholder={`https://${field.label.toLowerCase()}.com/...`}
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {allowsEnhancedStory ? (
              <section className="space-y-4 border-t border-slate-200 pt-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-950">Enhanced company story</h2>
                  <p className="text-sm text-slate-600">Give candidates a fuller picture of your mission, team, and day-to-day work experience.</p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="aboutSection" className="text-sm font-medium">
                    About your business
                  </label>
                  <textarea
                    id="aboutSection"
                    name="aboutSection"
                    rows={6}
                    maxLength={COMPANY_ENHANCED_TEXT_MAX_LENGTH}
                    defaultValue={editableCompany.aboutSection ?? ""}
                    placeholder="Share your story, customers, mission, and what makes your business part of the Salem community."
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="whyWorkHere" className="text-sm font-medium">
                    Why work here
                  </label>
                  <textarea
                    id="whyWorkHere"
                    name="whyWorkHere"
                    rows={5}
                    maxLength={COMPANY_ENHANCED_TEXT_MAX_LENGTH}
                    defaultValue={editableCompany.whyWorkHere ?? ""}
                    placeholder="Explain what candidates can expect from the team, leadership style, flexibility, growth, or culture."
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="benefits" className="text-sm font-medium">
                    Benefits and perks
                  </label>
                  <textarea
                    id="benefits"
                    name="benefits"
                    rows={5}
                    maxLength={COMPANY_ENHANCED_TEXT_MAX_LENGTH}
                    defaultValue={editableCompany.benefits ?? ""}
                    placeholder="List benefits, schedule perks, training support, or other reasons candidates choose your team."
                    className="w-full rounded border px-3 py-2"
                  />
                  <p className="text-xs text-slate-500">Markdown is supported in these enhanced sections.</p>
                </div>
              </section>
            ) : null}

            {allowsCompanyMedia ? (
              <section className="space-y-4 border-t border-slate-200 pt-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-950">Cover and gallery</h2>
                  <p className="text-sm text-slate-600">Use a simple cover image and up to two gallery images to make the page feel more complete.</p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="coverImageUrl" className="text-sm font-medium">
                    Cover image URL
                  </label>
                  <input
                    id="coverImageUrl"
                    name="coverImageUrl"
                    type="url"
                    maxLength={COMPANY_MEDIA_URL_MAX_LENGTH}
                    defaultValue={editableCompany.coverImageUrl ?? ""}
                    placeholder="https://example.com/company-cover.jpg"
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="galleryImageUrl1" className="text-sm font-medium">
                      Gallery image URL 1
                    </label>
                    <input
                      id="galleryImageUrl1"
                      name="galleryImageUrl1"
                      type="url"
                      maxLength={COMPANY_MEDIA_URL_MAX_LENGTH}
                      defaultValue={editableCompany.galleryImageUrl1 ?? ""}
                      placeholder="https://example.com/team-photo.jpg"
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="galleryImageUrl2" className="text-sm font-medium">
                      Gallery image URL 2
                    </label>
                    <input
                      id="galleryImageUrl2"
                      name="galleryImageUrl2"
                      type="url"
                      maxLength={COMPANY_MEDIA_URL_MAX_LENGTH}
                      defaultValue={editableCompany.galleryImageUrl2 ?? ""}
                      placeholder="https://example.com/workspace-photo.jpg"
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-500">Use hosted image URLs for now. Upload support is still outside the company-profile flow.</p>
              </section>
            ) : null}

            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p>
                Public company URL:{" "}
                <Link href={`/jobs/company/${editableCompany.slug}`} className="underline">
                  /jobs/company/{editableCompany.slug}
                </Link>
              </p>
              <p className="mt-1">The company slug stays fixed so existing links do not break.</p>
            </div>

            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
              Save company
            </button>
          </form>

          {!isAdmin && resolvedPlan && lockedProfileFeatures.length > 0 ? (
            <section className="grid gap-4 md:grid-cols-2">
              {lockedProfileFeatures.map((feature) => (
                <LockedPlanFeatureCard key={feature.id} plan={resolvedPlan} featureId={feature.id} />
              ))}
            </section>
          ) : null}
        </div>
      )}
    </section>
  )
}
