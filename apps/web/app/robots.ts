import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin/", "/signin", "/signup", "/post-job"]
      }
    ],
    sitemap: absoluteUrl("/sitemap.xml")
  }
}
