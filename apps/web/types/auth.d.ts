import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      roles: Array<"admin" | "business" | "user">
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: Array<"admin" | "business" | "user">
  }
}
