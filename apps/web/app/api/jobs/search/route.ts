import { parseJobsSearchParams } from "@/lib/job-search"
import { searchPublicJobs } from "@/lib/jobs"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const results = await searchPublicJobs(parseJobsSearchParams(url.searchParams))
  return Response.json(results)
}
