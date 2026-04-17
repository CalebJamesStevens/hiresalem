import { downloadStoredCompanyImage, isStoredCompanyImageKey } from "@/lib/company-image-storage"

type CompanyImageRouteContext = {
  params: Promise<{
    key: string[]
  }>
}

export const runtime = "nodejs"

function buildImageHeaders(filename: string, contentType: string, contentLength: number) {
  return {
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Content-Length": String(contentLength),
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff"
  }
}

export async function GET(_req: Request, { params }: CompanyImageRouteContext) {
  const resolvedParams = await params
  const key = resolvedParams.key.join("/")

  if (!isStoredCompanyImageKey(key)) {
    return Response.json({ error: "Image not found" }, { status: 404 })
  }

  try {
    const storedImage = await downloadStoredCompanyImage(key)

    return new Response(Buffer.from(storedImage.body), {
      headers: buildImageHeaders(storedImage.filename, storedImage.contentType, storedImage.contentLength)
    })
  } catch (error) {
    const errorName = typeof error === "object" && error !== null && "name" in error ? error.name : null

    if (errorName === "NoSuchKey") {
      return Response.json({ error: "Image not found" }, { status: 404 })
    }

    throw error
  }
}
