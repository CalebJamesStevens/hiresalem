"use client"

import { useState, type ChangeEvent } from "react"

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const allowedLogoExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"])

type CompanyLogoFieldProps = {
  id?: string
  name?: string
  currentImageSrc?: string | null
  currentImageAlt?: string
  removeFieldName?: string
}

function getFileExtension(filename: string) {
  const extensionIndex = filename.lastIndexOf(".")
  return extensionIndex >= 0 ? filename.slice(extensionIndex).toLowerCase() : ""
}

function getValidationMessage(file: File | null) {
  if (!file || file.size === 0) {
    return null
  }

  if (!allowedLogoExtensions.has(getFileExtension(file.name))) {
    return "Logo must be a PNG, JPG, JPEG, or WebP image."
  }

  if (file.size > MAX_LOGO_BYTES) {
    return "Logo must be 2 MB or smaller."
  }

  return null
}

export function CompanyLogoField({
  id = "logo",
  name = "logo",
  currentImageSrc,
  currentImageAlt,
  removeFieldName
}: CompanyLogoFieldProps) {
  const [error, setError] = useState<string | null>(null)
  const resolvedCurrentImageSrc = currentImageSrc ?? null
  const hasCurrentImage = Boolean(resolvedCurrentImageSrc)
  const helperId = `${id}-help`
  const errorId = `${id}-error`

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0] ?? null
    const nextError = getValidationMessage(file)

    input.setCustomValidity(nextError ?? "")
    setError(nextError)
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        Business logo
      </label>
      <input
        id={id}
        name={name}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${helperId} ${errorId}` : helperId}
        className={`w-full rounded border px-3 py-2 ${error ? "border-red-400 bg-red-50" : ""}`}
      />
      <p id={helperId} className="text-xs text-slate-500">
        Upload a PNG, JPG, or WebP logo up to 2 MB.
      </p>
      {error ? (
        <p id={errorId} className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {hasCurrentImage ? (
        <div className="flex items-center gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-3">
          <img
            src={resolvedCurrentImageSrc ?? undefined}
            alt={currentImageAlt ?? "Current business logo"}
            className="h-12 w-12 rounded-xl border border-slate-200 bg-white object-cover"
          />
          {removeFieldName ? (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name={removeFieldName} className="rounded border-slate-300" />
              Remove current logo
            </label>
          ) : (
            <p className="text-sm text-slate-700">Current logo</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
