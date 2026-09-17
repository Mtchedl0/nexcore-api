import { pgTable, serial, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const siteSettingsTable = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  serverName: varchar("server_name", { length: 100 }).notNull().default("SERVER NAME"),
  serverIp: varchar("server_ip", { length: 100 }).notNull().default("servername.net"),
  discordUrl: varchar("discord_url", { length: 200 }).notNull().default("https://discord.gg/servername"),
  primaryColor: varchar("primary_color", { length: 50 }).notNull().default("0 84% 60%"),
  secondaryColor: varchar("secondary_color", { length: 50 }).notNull().default("25 95% 53%"),
  bannerEnabled: boolean("banner_enabled").default(false),
  bannerText: varchar("banner_text", { length: 300 }).default(""),
  bannerColor: varchar("banner_color", { length: 50 }).default("primary"),
  bannerLink: varchar("banner_link", { length: 300 }).default(""),
  maintenanceMode: boolean("maintenance_mode").default(false),
  maintenanceMessage: varchar("maintenance_message", { length: 300 }).default("We are performing scheduled maintenance."),
  maintenanceSubtitle: varchar("maintenance_subtitle", { length: 300 }).default("We'll be back shortly. Follow our Discord for live updates."),
  faviconUrl: varchar("favicon_url", { length: 500 }).default(""),
  logoUrl: varchar("logo_url", { length: 500 }).default(""),
  tickerText: varchar("ticker_text", { length: 1000 }).default(""),
  partnerAppsOpen: boolean("partner_apps_open").default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type SiteSettings = typeof siteSettingsTable.$inferSelect;
