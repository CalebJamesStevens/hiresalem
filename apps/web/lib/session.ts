import type { Session } from "next-auth"

import { auth } from "@/auth"

export async function getSessionSafe(): Promise<Session | null> {
  try {
    return await auth()
  } catch {
    return null
  }
}
