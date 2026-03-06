export function buildCompanyJobsPath(slug: string) {
  return `/jobs/company/${slug}`
}

export function buildEmailDigestClickPath(targetPath: string) {
  const searchParams = new URLSearchParams({
    target: targetPath
  })

  return `/api/analytics/email-click?${searchParams.toString()}`
}
