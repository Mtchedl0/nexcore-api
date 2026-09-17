import { pgTable, serial, varchar, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const storeItemsTable = pgTable("store_items", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  price: varchar("price", { length: 50 }).notNull(),
  salePrice: varchar("sale_price", { length: 50 }),
  icon: varchar("icon", { length: 10 }).default("⭐"),
  badge: varchar("badge", { length: 50 }),
  featured: boolean("featured").default(false),
  featuredLabel: varchar("featured_label", { length: 100 }).default("Featured"),
  features: jsonb("features").$type<string[]>().default([]),
  colorTheme: varchar("color_theme", { length: 30 }).default("red"),
  meta: jsonb("meta").$type<Record<string, string | number>>().default({}),
  displayOrder: integer("display_order").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type StoreItem = typeof storeItemsTable.$inferSelect;
