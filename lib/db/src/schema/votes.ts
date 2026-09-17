import { pgTable, serial, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const votesTable = pgTable("votes", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull(),
  siteName: varchar("site_name", { length: 100 }).notNull(),
  playerUsername: varchar("player_username", { length: 50 }).notNull(),
  votedAt: timestamp("voted_at", { withTimezone: true }).defaultNow(),
});

export type Vote = typeof votesTable.$inferSelect;
