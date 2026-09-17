import { pgTable, serial, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  minecraftUsername: varchar("minecraft_username", { length: 50 }).notNull(),
  suspended: boolean("suspended").default(false),
  role: varchar("role", { length: 20 }).notNull().default("player"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({
  id: true, createdAt: true,
});
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
