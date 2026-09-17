import { Router } from "express";
import { db } from "../../lib/db/src/index.js";
import { ordersTable } from "../../lib/db/src/schema/index.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { requirePlayer } from "../middlewares/playerAuth.js";
import type { Request } from "express";
import type { AdminPayload } from "../middlewares/auth.js";
import type { PlayerPayload } from "../middlewares/playerAuth.js";

const router = Router();

type AuthReq = Request & { admin?: AdminPayload; player?: PlayerPayload };

router.post("/", requirePlayer, async (req: AuthReq, res) => {
  try {
    const player = req.player!;
    const { itemName, itemType, gamemode, price } = req.body;
    if (!itemName || !itemType || !gamemode || !price) {
      res.status(400).json({ error: "itemName, itemType, gamemode and price are required" });
      return;
    }

    const [order] = await db
      .insert(ordersTable)
      .values({
        playerId: player.id,
        playerUsername: player.username,
        minecraftUsername: player.minecraftUsername,
        itemName,
        itemType,
        gamemode,
        price,
        status: "pending",
      })
      .returning();

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to place order" });
  }
});

router.get("/my", requirePlayer, async (req: AuthReq, res) => {
  try {
    const player = req.player!;
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.playerId, player.id))
      .orderBy(desc(ordersTable.createdAt));
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.get("/", requireAuth, async (_req, res) => {
  try {
    const orders = await db
      .select()
      .from(ordersTable)
      .orderBy(desc(ordersTable.createdAt));
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.patch("/:id", requireAuth, async (req: AuthReq, res) => {
  try {
    const id = Number(req.params.id);
    const { status, notes } = req.body;
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const updates: Partial<typeof ordersTable.$inferInsert> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db
      .update(ordersTable)
      .set(updates)
      .where(eq(ordersTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

export default router;
