import type { Metadata } from "next"
import Link from "next/link"
import Script from "next/script"
import { Suspense } from "react"

import { AnalyticsListener } from "@/components/analytics-listener"
import { JsonLd } from "@/components/json-ld"
import { Navbar } from "@/components/navbar"
import { getGoatCounterEndpoint } from "@/lib/analytics"
import { siteConfig } from "@/lib/seo"
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/structured-data"
import "../styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: `${siteConfig.defaultTitle} | ${siteConfig.name}`,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.defaultDescription,
  alternates: {
    canonical: siteConfig.url
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: `${siteConfig.defaultTitle} | ${siteConfig.name}`,
    description: siteConfig.defaultDescription,
    url: siteConfig.url,
    images: [
      {
        url: siteConfig.defaultOgImagePath,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} Salem-area jobs`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.defaultTitle} | ${siteConfig.name}`,
    description: siteConfig.defaultDescription,
    images: [siteConfig.defaultOgImagePath]
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const goatCounterSite = process.env.NEXT_PUBLIC_GOATCOUNTER_SITE

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <JsonLd data={buildOrganizationJsonLd()} />
        <JsonLd data={buildWebsiteJsonLd()} />
        <Suspense fallback={null}>
          <AnalyticsListener />
        </Suspense>
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
        <footer className="border-t bg-white/80 px-4 py-6 text-center text-sm text-slate-500">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 md:flex-row">
            <Link href="/">hiresalem.com</Link>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/jobs/salem">Salem jobs</Link>
              <Link href="/jobs/keizer">Keizer jobs</Link>
              <Link href="/resources">Resources</Link>
            </div>
          </div>
        </footer>
        {goatCounterSite ? (
          <Script
            src="https://gc.zgo.at/count.js"
            data-goatcounter={getGoatCounterEndpoint(goatCounterSite)}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  )
}
