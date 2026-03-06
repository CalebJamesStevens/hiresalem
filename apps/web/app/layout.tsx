import type { Metadata } from "next"
import Link from "next/link"

import { Navbar } from "@/components/navbar"
import "../styles/globals.css"

export const metadata: Metadata = {
  title: "HireSalem",
  description: "Local jobs for Salem, Oregon"
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
        <footer className="border-t bg-white/80 px-4 py-6 text-center text-sm text-slate-500">
          <Link href="/">hiresalem.com</Link>
        </footer>
      </body>
    </html>
  )
}
