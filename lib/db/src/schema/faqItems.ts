import { pgTable, serial, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const faqItemsTable = pgTable("faq_items", {
  id: serial("id").primaryKey(),
  question: varchar("question", { length: 400 }).notNull(),
  answer: text("answer").notNull(),
  category: varchar("category", { length: 100 }).default("General"),
  displayOrder: integer("display_order").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type FaqItem = typeof faqItemsTable.$inferSelect;
