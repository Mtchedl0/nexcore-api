import { Router } from "express";
import { db } from "../../lib/db/src/index.js";
import { voteSitesTable } from "../../lib/db/src/schema/index.js";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireOwner } from "../middlewares/auth.js";
import type { AdminPayload } from "../middlewares/auth.js";
import type { Request } from "express";
import crypto from "crypto";

type AuthReq = Request & { admin?: AdminPayload };

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(voteSitesTable)
      .where(eq(voteSitesTable.active, true))
      .orderBy(asc(voteSitesTable.displayOrder));
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to fetch vote sites" }); }
});

router.get("/all", requireAuth, async (_req, res) => {
  try {
    const rows = await db.select().from(voteSitesTable).orderBy(asc(voteSitesTable.displayOrder));
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to fetch vote sites" }); }
});

router.post("/", requireAuth, requireOwner, async (req: AuthReq, res) => {
  try {
    const { name, url, icon, description, reward, cooldown, colorGradient, displayOrder } = req.body;
    if (!name || !url) { res.status(400).json({ error: "name and url are required" }); return; }
    const callbackToken = crypto.randomBytes(32).toString("hex");
    const [row] = await db.insert(voteSitesTable).values({
      name, url,
      icon: icon || "🗳️",
      description: description || "",
      reward: reward || "",
      cooldown: cooldown || "Every 24 hours",
      colorGradient: colorGradient || "from-primary to-accent",
      displayOrder: displayOrder ?? 0,
      callbackToken,
    }).returning();
    res.status(201).json(row);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to create vote site" }); }
});

router.patch("/:id", requireAuth, requireOwner, async (req: AuthReq, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, url, icon, description, reward, cooldown, colorGradient, displayOrder, active } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (icon !== undefined) updates.icon = icon;
    if (description !== undefined) updates.description = description;
    if (reward !== undefined) updates.reward = reward;
    if (cooldown !== undefined) updates.cooldown = cooldown;
    if (colorGradient !== undefined) updates.colorGradient = colorGradient;
    if (displayOrder !== undefined) updates.displayOrder = displayOrder;
    if (active !== undefined) updates.active = active;
    const [row] = await db.update(voteSitesTable).set(updates).where(eq(voteSitesTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Vote site not found" }); return; }
    res.json(row);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to update vote site" }); }
});

router.delete("/:id", requireAuth, requireOwner, async (req: AuthReq, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(voteSitesTable).where(eq(voteSitesTable.id, id));
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to delete vote site" }); }
});

export default router;
