import { defineConfig } from "drizzle-kit"
import "./env"

export default defineConfig({
  schema: "./schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? ""
  }
})
