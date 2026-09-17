import { pgTable, serial, varchar, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  playerUsername: varchar("player_username", { length: 50 }).notNull(),
  minecraftUsername: varchar("minecraft_username", { length: 50 }).notNull(),
  itemName: varchar("item_name", { length: 200 }).notNull(),
  itemType: varchar("item_type", { length: 50 }).notNull(),
  gamemode: varchar("gamemode", { length: 50 }).notNull(),
  price: varchar("price", { length: 30 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
