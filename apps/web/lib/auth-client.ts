export function getSignOutCallbackUrl(_origin?: string | null, path = "/") {
  return path.startsWith("/") ? path : "/"
}
