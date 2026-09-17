import { pgTable, serial, varchar, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const gamemodesTable = pgTable("gamemodes", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 10 }).default("⚔️"),
  status: varchar("status", { length: 20 }).default("active"),
  players: varchar("players", { length: 50 }).default("Open"),
  description: text("description"),
  features: jsonb("features").$type<string[]>().default([]),
  colorTheme: varchar("color_theme", { length: 30 }).default("red"),
  displayOrder: integer("display_order").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Gamemode = typeof gamemodesTable.$inferSelect;
