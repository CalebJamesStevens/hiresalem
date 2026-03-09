import { parseJobsSearchParams } from "@/lib/job-search"
import { type PublicJobSearchResult, listMatchingPublicJobsForAlert } from "@/lib/jobs"
import { siteConfig } from "@/lib/seo"
import { sendEmail } from "@/lib/email"
import { type SavedSearch, listSavedSearchesReadyForDigest, markSavedSearchDigestsSent } from "@/lib/saved-searches"
import { buildEmailDigestClickPath } from "@/lib/site-paths"

type SavedSearchDigestSection = {
  savedSearch: SavedSearch
  jobs: PublicJobSearchResult[]
}

type SavedSearchDigestRecipient = {
  recipientEmail: string
  sections: SavedSearchDigestSection[]
}

export type SavedSearchDigestRunSummary = {
  processedSearches: number
  recipientCount: number
  sentEmails: number
  deliveredSearches: number
  noMatchSearches: number
  recipientSummaries: Array<{
    recipientEmail: string
    savedSearchCount: number
    matchedSearchCount: number
    matchedJobCount: number
    sent: boolean
    providerMessageId?: string
  }>
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function getSearchParamsFromSavedSearch(queryString: string) {
  const url = new URL(queryString, siteConfig.url)
  return parseJobsSearchParams(url.searchParams)
}

function buildTrackedAbsoluteUrl(targetPath: string) {
  return new URL(buildEmailDigestClickPath(targetPath), siteConfig.url).toString()
}

function buildDigestSubject(recipient: SavedSearchDigestRecipient) {
  if (recipient.sections.length === 1) {
    return `${recipient.sections[0].jobs.length} new jobs for ${recipient.sections[0].savedSearch.name}`
  }

  return `${recipient.sections.reduce((total, section) => total + section.jobs.length, 0)} new HireSalem job matches today`
}

function buildDigestHtml(recipient: SavedSearchDigestRecipient) {
  const sections = recipient.sections
    .map((section) => {
      const openSearchUrl = buildTrackedAbsoluteUrl(section.savedSearch.queryString)
      const jobs = section.jobs
        .map((job) => {
          const jobUrl = buildTrackedAbsoluteUrl(`/jobs/${job.slug}`)
          const company = escapeHtml(job.companyName ?? "Local employer")
          const location = escapeHtml(job.location ?? "Salem, OR")

          return `
            <li style="margin:0 0 16px;">
              <a href="${jobUrl}" style="color:#0f172a;font-weight:600;text-decoration:none;">${escapeHtml(job.title)}</a>
              <div style="color:#475569;font-size:14px;margin-top:4px;">${company} • ${location}</div>
            </li>
          `
        })
        .join("")

      return `
        <section style="margin:0 0 28px;">
          <h2 style="font-size:20px;line-height:1.3;margin:0 0 10px;color:#0f172a;">${escapeHtml(section.savedSearch.name)}</h2>
          <p style="margin:0 0 12px;color:#475569;font-size:14px;">
            <a href="${openSearchUrl}" style="color:#0f172a;text-decoration:underline;">Open this saved search on HireSalem</a>
          </p>
          <ul style="padding-left:18px;margin:0;">
            ${jobs}
          </ul>
        </section>
      `
    })
    .join("")

  return `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#0f172a;">
      <p style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#64748b;margin:0 0 12px;">HireSalem daily digest</p>
      <h1 style="font-size:30px;line-height:1.15;margin:0 0 14px;">New Salem-area job matches</h1>
      <p style="font-size:16px;line-height:1.6;color:#334155;margin:0 0 24px;">
        Here are the new roles that matched your saved searches today. Open any listing to review details and apply.
      </p>
      ${sections}
      <p style="font-size:13px;line-height:1.6;color:#64748b;margin:24px 0 0;">
        You are receiving this because daily alerts are enabled for one or more saved searches on HireSalem.
      </p>
    </div>
  `
}

function buildDigestText(recipient: SavedSearchDigestRecipient) {
  const sections = recipient.sections
    .map((section) => {
      const jobs = section.jobs
        .map((job) => `- ${job.title} | ${job.companyName ?? "Local employer"} | ${job.location ?? "Salem, OR"} | ${siteConfig.url}/jobs/${job.slug}`)
        .join("\n")

      return `${section.savedSearch.name}\n${siteConfig.url}${section.savedSearch.queryString}\n${jobs}`
    })
    .join("\n\n")

  return `New Salem-area job matches on HireSalem\n\n${sections}`
}

function getLatestJobDate(jobs: PublicJobSearchResult[]) {
  if (jobs.length === 0) {
    return null
  }

  return jobs.reduce<Date>((latest, job) => (job.createdAt > latest ? job.createdAt : latest), jobs[0].createdAt)
}

export async function runSavedSearchDigests(referenceDate = new Date()): Promise<SavedSearchDigestRunSummary> {
  const readySearches = await listSavedSearchesReadyForDigest(referenceDate)
  const groupedRecipients = new Map<string, SavedSearch[]>()
  const recipientSummaries: SavedSearchDigestRunSummary["recipientSummaries"] = []

  for (const savedSearch of readySearches) {
    const recipientEmail = savedSearch.recipientEmail?.trim().toLowerCase()
    if (!recipientEmail) {
      continue
    }

    const existing = groupedRecipients.get(recipientEmail) ?? []
    existing.push(savedSearch)
    groupedRecipients.set(recipientEmail, existing)
  }

  let sentEmails = 0
  let deliveredSearches = 0
  let noMatchSearches = 0

  for (const [recipientEmail, savedSearches] of groupedRecipients) {
    const sections = (
      await Promise.all(
        savedSearches.map(async (savedSearch) => {
          const jobs = await listMatchingPublicJobsForAlert(
            getSearchParamsFromSavedSearch(savedSearch.queryString),
            savedSearch.lastDeliveredJobCreatedAt ?? null
          )

          return {
            savedSearch,
            jobs
          }
        })
      )
    ).filter((section) => section.jobs.length > 0)

    const updates = savedSearches.map((savedSearch) => {
      const section = sections.find((candidate) => candidate.savedSearch.id === savedSearch.id)
      return {
        id: savedSearch.id,
        lastDigestSentAt: referenceDate,
        lastDeliveredJobCreatedAt: section ? getLatestJobDate(section.jobs) : savedSearch.lastDeliveredJobCreatedAt
      }
    })

    if (sections.length === 0) {
      noMatchSearches += savedSearches.length
      recipientSummaries.push({
        recipientEmail,
        savedSearchCount: savedSearches.length,
        matchedSearchCount: 0,
        matchedJobCount: 0,
        sent: false
      })
      await markSavedSearchDigestsSent(updates)
      continue
    }

    const recipient = {
      recipientEmail,
      sections
    }

    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: buildDigestSubject(recipient),
      html: buildDigestHtml(recipient),
      text: buildDigestText(recipient)
    })

    sentEmails += 1
    deliveredSearches += sections.length
    noMatchSearches += savedSearches.length - sections.length
    recipientSummaries.push({
      recipientEmail,
      savedSearchCount: savedSearches.length,
      matchedSearchCount: sections.length,
      matchedJobCount: sections.reduce((total, section) => total + section.jobs.length, 0),
      sent: true,
      providerMessageId: emailResult.id
    })
    await markSavedSearchDigestsSent(updates)
  }

  return {
    processedSearches: readySearches.length,
    recipientCount: groupedRecipients.size,
    sentEmails,
    deliveredSearches,
    noMatchSearches,
    recipientSummaries
  }
}
