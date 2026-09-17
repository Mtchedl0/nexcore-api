import { Router } from "express";
import { db } from "../../lib/db/src/index.js";
import { storeItemsTable } from "../../lib/db/src/schema/index.js";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const items = await db
      .select()
      .from(storeItemsTable)
      .where(eq(storeItemsTable.active, true))
      .orderBy(asc(storeItemsTable.displayOrder));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch store items" });
  }
});

router.get("/all", requireAuth, async (_req, res) => {
  try {
    const items = await db
      .select()
      .from(storeItemsTable)
      .orderBy(asc(storeItemsTable.category), asc(storeItemsTable.displayOrder));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { category, name, price, salePrice, icon, badge, featured, featuredLabel, features, colorTheme, meta, displayOrder } = req.body;
    const [item] = await db.insert(storeItemsTable).values({
      category, name, price,
      salePrice: salePrice || null,
      icon: icon || "⭐",
      badge: badge || null,
      featured: featured ?? false,
      featuredLabel: featuredLabel || "Featured",
      features: features || [],
      colorTheme: colorTheme || "red",
      meta: meta || {},
      displayOrder: displayOrder ?? 0,
    }).returning();
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create item" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { category, name, price, salePrice, icon, badge, featured, featuredLabel, features, colorTheme, meta, displayOrder, active } = req.body;
    const updates: Record<string, unknown> = {};
    if (category !== undefined) updates.category = category;
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = price;
    if (salePrice !== undefined) updates.salePrice = salePrice || null;
    if (icon !== undefined) updates.icon = icon;
    if (badge !== undefined) updates.badge = badge || null;
    if (featured !== undefined) updates.featured = featured;
    if (featuredLabel !== undefined) updates.featuredLabel = featuredLabel || "Featured";
    if (features !== undefined) updates.features = features;
    if (colorTheme !== undefined) updates.colorTheme = colorTheme;
    if (meta !== undefined) updates.meta = meta;
    if (displayOrder !== undefined) updates.displayOrder = displayOrder;
    if (active !== undefined) updates.active = active;

    const [item] = await db.update(storeItemsTable).set(updates).where(eq(storeItemsTable.id, id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(storeItemsTable).where(eq(storeItemsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

export default router;
