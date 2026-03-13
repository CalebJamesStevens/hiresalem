export function getSignOutCallbackUrl(origin?: string | null, path = "/") {
  if (!origin) {
    return path
  }

  try {
    return new URL(path, origin).toString()
  } catch {
    return path
  }
}
