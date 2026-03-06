import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  ownerAuthId: text("owner_auth_id").notNull().unique(),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow().notNull()
})
