import { Router } from "express";
import { db } from "../../lib/db/src/index.js";
import { couponsTable } from "../../lib/db/src/schema/index.js";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireOwner } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, requireOwner, async (_req, res) => {
  try {
    const coupons = await db.select().from(couponsTable).orderBy(asc(couponsTable.createdAt));
    res.json(coupons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

router.post("/validate", async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code) return res.status(400).json({ error: "No code provided" });

    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, code.toUpperCase().trim()));
    if (!coupon || !coupon.active) return res.status(404).json({ error: "Invalid or expired coupon code" });

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date())
      return res.status(400).json({ error: "This coupon has expired" });

    if (coupon.maxUses && coupon.maxUses > 0 && (coupon.usesCount ?? 0) >= coupon.maxUses)
      return res.status(400).json({ error: "This coupon has reached its usage limit" });

    const order = parseInt(orderAmount) || 0;
    if (coupon.minOrder && coupon.minOrder > 0 && order < coupon.minOrder)
      return res.status(400).json({ error: `Minimum order of ${coupon.minOrder} required for this coupon` });

    let discount = 0;
    if (coupon.type === "percent") discount = Math.floor((order * coupon.value) / 100);
    else discount = Math.min(coupon.value, order);

    res.json({ valid: true, coupon, discount, finalAmount: Math.max(0, order - discount) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to validate coupon" });
  }
});

router.post("/", requireAuth, requireOwner, async (req, res) => {
  try {
    const { code, type, value, minOrder, maxUses, expiresAt } = req.body;
    if (!code || !value) return res.status(400).json({ error: "Code and value required" });
    const [coupon] = await db.insert(couponsTable).values({
      code: code.toUpperCase().trim(),
      type: type || "percent",
      value: parseInt(value),
      minOrder: parseInt(minOrder) || 0,
      maxUses: parseInt(maxUses) || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    }).returning();
    res.json(coupon);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique")) return res.status(400).json({ error: "Coupon code already exists" });
    console.error(err);
    res.status(500).json({ error: "Failed to create coupon" });
  }
});

router.patch("/:id", requireAuth, requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { code, type, value, minOrder, maxUses, expiresAt, active } = req.body;
    const updates: Record<string, unknown> = {};
    if (code !== undefined) updates.code = code.toUpperCase().trim();
    if (type !== undefined) updates.type = type;
    if (value !== undefined) updates.value = parseInt(value);
    if (minOrder !== undefined) updates.minOrder = parseInt(minOrder) || 0;
    if (maxUses !== undefined) updates.maxUses = parseInt(maxUses) || 0;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (active !== undefined) updates.active = active;
    const [coupon] = await db.update(couponsTable).set(updates).where(eq(couponsTable.id, id)).returning();
    if (!coupon) return res.status(404).json({ error: "Not found" });
    res.json(coupon);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update coupon" });
  }
});

router.delete("/:id", requireAuth, requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(couponsTable).where(eq(couponsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete coupon" });
  }
});

export default router;
