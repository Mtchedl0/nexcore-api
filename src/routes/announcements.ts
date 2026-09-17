import { Router } from "express";
import { db } from "../../lib/db/src/index.js";
import { announcementsTable } from "../../lib/db/src/schema/index.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireOwner } from "../middlewares/auth.js";
import type { Request } from "express";
import type { AdminPayload } from "../middlewares/auth.js";

const router = Router();

type AuthRequest = Request & { admin?: AdminPayload };

router.get("/", async (_req, res) => {
  try {
    const items = await db
      .select()
      .from(announcementsTable)
      .orderBy(desc(announcementsTable.pinned), desc(announcementsTable.createdAt));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

router.post("/", requireAuth, requireOwner, async (req: AuthRequest, res) => {
  try {
    const { title, body, type = "update", pinned = false } = req.body;
    if (!title || !body) {
      res.status(400).json({ error: "title and body are required" });
      return;
    }
    const admin = req.admin!;
    const [created] = await db
      .insert(announcementsTable)
      .values({
        title,
        body,
        type,
        pinned,
        authorId: admin.id,
        authorName: admin.username,
        authorRole: admin.role,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

router.patch("/:id", requireAuth, requireOwner, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { title, body, type, pinned } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (body !== undefined) updates.body = body;
    if (type !== undefined) updates.type = type;
    if (pinned !== undefined) updates.pinned = pinned;

    const [updated] = await db
      .update(announcementsTable)
      .set(updates)
      .where(eq(announcementsTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update" });
  }
});

router.delete("/:id", requireAuth, requireOwner, async (_req, res) => {
  try {
    const id = Number(_req.params.id);
    await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
