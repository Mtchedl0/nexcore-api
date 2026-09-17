import { Router } from "express";
import { db } from "../../lib/db/src/index.js";
import { gamemodesTable } from "../../lib/db/src/schema/index.js";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const modes = await db
      .select()
      .from(gamemodesTable)
      .where(eq(gamemodesTable.active, true))
      .orderBy(asc(gamemodesTable.displayOrder));
    res.json(modes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch gamemodes" });
  }
});

router.get("/all", requireAuth, async (_req, res) => {
  try {
    const modes = await db
      .select()
      .from(gamemodesTable)
      .orderBy(asc(gamemodesTable.displayOrder));
    res.json(modes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, icon, status, players, description, features, colorTheme, displayOrder } = req.body;
    const [mode] = await db.insert(gamemodesTable).values({
      title,
      icon: icon || "⚔️",
      status: status || "active",
      players: players || "Open",
      description: description || "",
      features: features || [],
      colorTheme: colorTheme || "red",
      displayOrder: displayOrder ?? 0,
    }).returning();
    res.json(mode);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create gamemode" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, icon, status, players, description, features, colorTheme, displayOrder, active } = req.body;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (icon !== undefined) updates.icon = icon;
    if (status !== undefined) updates.status = status;
    if (players !== undefined) updates.players = players;
    if (description !== undefined) updates.description = description;
    if (features !== undefined) updates.features = features;
    if (colorTheme !== undefined) updates.colorTheme = colorTheme;
    if (displayOrder !== undefined) updates.displayOrder = displayOrder;
    if (active !== undefined) updates.active = active;

    const [mode] = await db.update(gamemodesTable).set(updates).where(eq(gamemodesTable.id, id)).returning();
    if (!mode) return res.status(404).json({ error: "Not found" });
    res.json(mode);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update gamemode" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(gamemodesTable).where(eq(gamemodesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete gamemode" });
  }
});

export default router;
