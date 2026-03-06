import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { normalizeRoles } from "@/lib/authz"
import { signInWithKeycloakPassword } from "@/lib/keycloak"

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ""

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  secret: authSecret,
  trustHost: true,
  pages: {
    signIn: "/signin"
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        const email = typeof credentials.email === "string" ? credentials.email.trim().toLowerCase() : ""
        const password = typeof credentials.password === "string" ? credentials.password : ""

        if (!email || !password) {
          return null
        }

        const authenticated = await signInWithKeycloakPassword({ email, password })

        if (!authenticated) {
          return null
        }

        return {
          id: authenticated.sub,
          email: authenticated.email ?? email,
          name: authenticated.name ?? email,
          roles: authenticated.roles
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const userRoles = normalizeRoles((user as { roles?: unknown }).roles)
        token.roles = userRoles
        if (typeof user.id === "string") {
          token.sub = user.id
        }
      } else if (trigger === "update") {
        token.roles = normalizeRoles(session?.user?.roles ?? token.roles)
      } else {
        token.roles = normalizeRoles(token.roles)
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ""
        session.user.roles = normalizeRoles(token.roles)
      }

      return session
    }
  }
})
