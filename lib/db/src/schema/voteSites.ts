import { pgTable, serial, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const voteSitesTable = pgTable("vote_sites", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  url: varchar("url", { length: 300 }).notNull(),
  icon: varchar("icon", { length: 20 }).notNull().default("🗳️"),
  description: text("description").notNull().default(""),
  reward: varchar("reward", { length: 200 }).notNull().default(""),
  cooldown: varchar("cooldown", { length: 100 }).notNull().default("Every 24 hours"),
  colorGradient: varchar("color_gradient", { length: 200 }).notNull().default("from-primary to-accent"),
  displayOrder: integer("display_order").notNull().default(0),
  active: boolean("active").default(true),
  callbackToken: varchar("callback_token", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type VoteSite = typeof voteSitesTable.$inferSelect;
