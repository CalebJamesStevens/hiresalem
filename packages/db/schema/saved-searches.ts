import { timestamp, text, uuid, pgTable } from "drizzle-orm/pg-core"

export const savedSearches = pgTable("saved_searches", {
  id: uuid("id").defaultRandom().primaryKey(),
  userAuthId: text("user_auth_id").notNull(),
  name: text("name").notNull(),
  queryString: text("query_string").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})
