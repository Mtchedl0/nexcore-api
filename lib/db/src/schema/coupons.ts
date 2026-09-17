import { pgTable, serial, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const couponsTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  type: varchar("type", { length: 20 }).notNull().default("percent"),
  value: integer("value").notNull().default(10),
  minOrder: integer("min_order").default(0),
  maxUses: integer("max_uses").default(0),
  usesCount: integer("uses_count").default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Coupon = typeof couponsTable.$inferSelect;
