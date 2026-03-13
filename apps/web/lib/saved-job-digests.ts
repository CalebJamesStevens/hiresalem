import { siteConfig } from "@/lib/seo"
import { sendEmail } from "@/lib/email"
import { listSavedJobsReadyForAlerts, markSavedJobsAlertState, type SavedJobAlertState } from "@/lib/saved-jobs"

type SavedJobAlertRecipient = {
  recipientEmail: string
  jobs: Array<{
    id: string
    state: SavedJobAlertState
    jobSlug: string
    jobTitle: string
    jobLocation: string | null
    jobCompanyName: string | null
  }>
}

export type SavedJobDigestRunSummary = {
  processedSavedJobs: number
  recipientCount: number
  sentEmails: number
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function buildSubject(recipient: SavedJobAlertRecipient) {
  return recipient.jobs.length === 1 ? `Saved job update: ${recipient.jobs[0].jobTitle}` : `${recipient.jobs.length} saved job updates on HireSalem`
}

function buildStateLabel(state: SavedJobAlertState) {
  return state === "live" ? "Live again" : "Closed"
}

function buildHtml(recipient: SavedJobAlertRecipient) {
  const items = recipient.jobs
    .map((job) => {
      const href = `${siteConfig.url}/jobs/${job.jobSlug}`
      return `
        <li style="margin:0 0 16px;">
          <a href="${href}" style="color:#0f172a;font-weight:600;text-decoration:none;">${escapeHtml(job.jobTitle)}</a>
          <div style="color:#475569;font-size:14px;margin-top:4px;">${escapeHtml(job.jobCompanyName ?? "Local employer")} • ${escapeHtml(job.jobLocation ?? "Salem, OR")}</div>
          <div style="color:#0f172a;font-size:14px;margin-top:4px;">Status: ${buildStateLabel(job.state)}</div>
        </li>
      `
    })
    .join("")

  return `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#0f172a;">
      <p style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#64748b;margin:0 0 12px;">HireSalem saved job updates</p>
      <h1 style="font-size:30px;line-height:1.15;margin:0 0 14px;">A saved job changed status</h1>
      <p style="font-size:16px;line-height:1.6;color:#334155;margin:0 0 24px;">
        Here are the latest status changes for the jobs you bookmarked on HireSalem.
      </p>
      <ul style="padding-left:18px;margin:0;">${items}</ul>
    </div>
  `
}

function buildText(recipient: SavedJobAlertRecipient) {
  const jobs = recipient.jobs
    .map((job) => `${job.jobTitle} | ${job.jobCompanyName ?? "Local employer"} | ${buildStateLabel(job.state)} | ${siteConfig.url}/jobs/${job.jobSlug}`)
    .join("\n")

  return `Saved job updates on HireSalem\n\n${jobs}`
}

export async function runSavedJobDigests(): Promise<SavedJobDigestRunSummary> {
  const jobs = await listSavedJobsReadyForAlerts()
  const grouped = new Map<string, SavedJobAlertRecipient>()

  for (const job of jobs) {
    const recipientEmail = job.recipientEmail.trim().toLowerCase()
    const existing = grouped.get(recipientEmail) ?? {
      recipientEmail,
      jobs: []
    }

    existing.jobs.push({
      id: job.id,
      state: job.currentState,
      jobSlug: job.jobSlug,
      jobTitle: job.jobTitle,
      jobLocation: job.jobLocation,
      jobCompanyName: job.jobCompanyName
    })

    grouped.set(recipientEmail, existing)
  }

  let sentEmails = 0

  for (const recipient of grouped.values()) {
    await sendEmail({
      to: recipient.recipientEmail,
      subject: buildSubject(recipient),
      html: buildHtml(recipient),
      text: buildText(recipient)
    })

    sentEmails += 1

    await markSavedJobsAlertState(recipient.jobs.map((job) => ({ id: job.id, state: job.state })))
  }

  return {
    processedSavedJobs: jobs.length,
    recipientCount: grouped.size,
    sentEmails
  }
}
