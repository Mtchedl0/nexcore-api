import { Router } from "express";
import { db } from "../../lib/db/src/index.js";
import { faqItemsTable } from "../../lib/db/src/schema/index.js";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireOwner } from "../middlewares/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const items = await db
      .select()
      .from(faqItemsTable)
      .where(eq(faqItemsTable.active, true))
      .orderBy(asc(faqItemsTable.displayOrder));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch FAQ items" });
  }
});

router.get("/all", requireAuth, async (_req, res) => {
  try {
    const items = await db
      .select()
      .from(faqItemsTable)
      .orderBy(asc(faqItemsTable.displayOrder));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/", requireAuth, requireOwner, async (req, res) => {
  try {
    const { question, answer, category, displayOrder } = req.body;
    const [item] = await db.insert(faqItemsTable).values({
      question, answer,
      category: category || "General",
      displayOrder: displayOrder ?? 0,
    }).returning();
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create FAQ item" });
  }
});

router.patch("/:id", requireAuth, requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { question, answer, category, displayOrder, active } = req.body;
    const updates: Record<string, unknown> = {};
    if (question !== undefined) updates.question = question;
    if (answer !== undefined) updates.answer = answer;
    if (category !== undefined) updates.category = category;
    if (displayOrder !== undefined) updates.displayOrder = displayOrder;
    if (active !== undefined) updates.active = active;
    const [item] = await db.update(faqItemsTable).set(updates).where(eq(faqItemsTable.id, id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update FAQ item" });
  }
});

router.delete("/:id", requireAuth, requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(faqItemsTable).where(eq(faqItemsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete FAQ item" });
  }
});

export default router;
