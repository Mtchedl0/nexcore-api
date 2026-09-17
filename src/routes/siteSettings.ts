import { Router } from "express";
import { db } from "../../lib/db/src/index.js";
import { siteSettingsTable } from "../../lib/db/src/schema/index.js";
import { requireAuth, requireOwner } from "../middlewares/auth.js";
import type { AdminPayload } from "../middlewares/auth.js";
import type { Request } from "express";

type AuthReq = Request & { admin?: AdminPayload };

const router = Router();

const DEFAULTS = {
  serverName: "SERVER NAME",
  serverIp: "servername.net",
  discordUrl: "https://discord.gg/servername",
  primaryColor: "0 84% 60%",
  secondaryColor: "25 95% 53%",
  bannerEnabled: false,
  bannerText: "",
  bannerColor: "primary",
  bannerLink: "",
  maintenanceMode: false,
  maintenanceMessage: "We are performing scheduled maintenance.",
  maintenanceSubtitle: "We'll be back shortly. Follow our Discord for live updates.",
  faviconUrl: "",
  logoUrl: "",
  tickerText: "",
  partnerAppsOpen: false,
};

router.get("/", async (_req, res) => {
  try {
    const [row] = await db.select().from(siteSettingsTable).limit(1);
    res.json(row ?? DEFAULTS);
  } catch (err) {
    console.error(err);
    res.json(DEFAULTS);
  }
});

router.patch("/", requireAuth, requireOwner, async (req: AuthReq, res) => {
  try {
    const {
      serverName, serverIp, discordUrl, primaryColor, secondaryColor,
      bannerEnabled, bannerText, bannerColor, bannerLink,
      maintenanceMode, maintenanceMessage, maintenanceSubtitle,
      faviconUrl, logoUrl, tickerText, partnerAppsOpen,
    } = req.body;
    const updates: Record<string, unknown> = {};
    if (serverName?.trim()) updates.serverName = serverName.trim();
    if (serverIp?.trim()) updates.serverIp = serverIp.trim();
    if (discordUrl !== undefined) updates.discordUrl = discordUrl.trim();
    if (primaryColor?.trim()) updates.primaryColor = primaryColor.trim();
    if (secondaryColor?.trim()) updates.secondaryColor = secondaryColor.trim();
    if (bannerEnabled !== undefined) updates.bannerEnabled = bannerEnabled;
    if (bannerText !== undefined) updates.bannerText = bannerText;
    if (bannerColor !== undefined) updates.bannerColor = bannerColor;
    if (bannerLink !== undefined) updates.bannerLink = bannerLink;
    if (maintenanceMode !== undefined) updates.maintenanceMode = maintenanceMode;
    if (maintenanceMessage !== undefined) updates.maintenanceMessage = maintenanceMessage;
    if (maintenanceSubtitle !== undefined) updates.maintenanceSubtitle = maintenanceSubtitle;
    if (faviconUrl !== undefined) updates.faviconUrl = faviconUrl;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;
    if (tickerText !== undefined) updates.tickerText = tickerText;
    if (partnerAppsOpen !== undefined) updates.partnerAppsOpen = partnerAppsOpen;

    const [existing] = await db.select().from(siteSettingsTable).limit(1);
    let result;
    if (existing) {
      [result] = await db.update(siteSettingsTable).set({ ...updates, updatedAt: new Date() }).returning();
    } else {
      [result] = await db.insert(siteSettingsTable).values({ ...DEFAULTS, ...updates }).returning();
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
