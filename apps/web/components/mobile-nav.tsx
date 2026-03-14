"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

import { SiteBrand } from "@/components/site-brand"

type NavItem = {
  href: string
  label: string
}

export function MobileNav({
  primaryItems,
  secondaryItems,
  children
}: {
  primaryItems: NavItem[]
  secondaryItems: NavItem[]
  children?: ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = isOpen ? "hidden" : previousOverflow

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMounted, isOpen])

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-drawer"
      >
        Menu
      </button>

      {isMounted
        ? createPortal(
            <div className={`fixed inset-0 z-[200] transition ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!isOpen}>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`absolute inset-0 z-40 bg-slate-950/35 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
                aria-label="Close navigation menu"
              />

              <div
                id="mobile-nav-drawer"
                className={`absolute right-0 top-0 z-50 flex h-full w-[min(24rem,88vw)] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl transition-transform ${
                  isOpen ? "translate-x-0" : "translate-x-full"
                }`}
                onClickCapture={(event) => {
                  const target = event.target as HTMLElement

                  if (target.closest("a,button")) {
                    setIsOpen(false)
                  }
                }}
              >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <SiteBrand
                      className="gap-2"
                      iconClassName="h-8 w-8"
                      labelClassName="text-sm font-semibold tracking-[0.16em]"
                    />
                    <p className="mt-1 text-sm text-slate-600">Local Salem-area navigation</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-4 text-sm font-medium text-slate-900"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-white px-5 py-5">
                  <div className="space-y-2">
                    {primaryItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex rounded-2xl border border-slate-200 px-4 py-3 text-base font-medium text-slate-900"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  {secondaryItems.length > 0 ? (
                    <div className="mt-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Account</p>
                      <div className="mt-3 space-y-2">
                        {secondaryItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex rounded-2xl border border-slate-200 px-4 py-3 text-base font-medium text-slate-900"
                          >
                            {item.label}
                          </Link>
                        ))}
                        {children ? <div className="rounded-2xl border border-slate-200 px-4 py-1 text-base font-medium text-slate-900">{children}</div> : null}
                      </div>
                    </div>
                  ) : children ? (
                    <div className="mt-6 rounded-2xl border border-slate-200 px-4 py-1 text-base font-medium text-slate-900">{children}</div>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
