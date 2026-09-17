import { pgTable, serial, varchar, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  type: varchar("type", { length: 30 }).notNull().default("update"),
  authorId: integer("author_id"),
  authorName: varchar("author_name", { length: 50 }).notNull(),
  authorRole: varchar("author_role", { length: 20 }).notNull(),
  pinned: boolean("pinned").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertAnnouncementSchema = createInsertSchema(announcementsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcementsTable.$inferSelect;
