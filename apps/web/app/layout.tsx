import type { Metadata } from "next"
import Link from "next/link"
import Script from "next/script"
import { Suspense } from "react"

import { AnalyticsListener } from "@/components/analytics-listener"
import { JsonLd } from "@/components/json-ld"
import { Navbar } from "@/components/navbar"
import { SiteBrand } from "@/components/site-brand"
import { getGoatCounterEndpoint, getGoatCounterScriptSrc } from "@/lib/analytics"
import { siteConfig } from "@/lib/seo"
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/lib/support"
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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.svg"]
  },
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
      <body className="overflow-x-hidden bg-slate-50 text-slate-900 antialiased">
        <JsonLd data={buildOrganizationJsonLd()} />
        <JsonLd data={buildWebsiteJsonLd()} />
        <Suspense fallback={null}>
          <AnalyticsListener />
        </Suspense>
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 pb-6 pt-1 md:py-10">{children}</main>
        <footer className="border-t bg-white/80 px-4 py-6 text-center text-sm text-slate-500">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 md:flex-row">
            <SiteBrand
              href="/"
              className="gap-2.5"
              iconClassName="h-10 w-10"
              labelClassName="text-sm font-semibold tracking-[0.16em] text-slate-700"
              label="HIRESALEM"
            />
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/jobs/salem">Salem jobs</Link>
              <Link href="/jobs/keizer">Keizer jobs</Link>
              <Link href="/employers">Employers</Link>
              <Link href="/resources">Resources</Link>
              <a href={SUPPORT_EMAIL_HREF} className="hover:text-slate-700">
                Support
              </a>
            </div>
            <a href={SUPPORT_EMAIL_HREF} className="text-slate-600 hover:text-slate-900">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </footer>
        {goatCounterSite ? (
          <Script
            src={getGoatCounterScriptSrc(goatCounterSite)}
            data-goatcounter={getGoatCounterEndpoint(goatCounterSite)}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  )
}
