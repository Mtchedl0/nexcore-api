import { Router } from "express";
import { db } from "../../lib/db/src/index.js";
import { announcementsTable, ordersTable, playersTable, adminUsersTable } from "../../lib/db/src/schema/index.js";
import { count, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  try {
    const [{ value: totalPlayers }] = await db.select({ value: count() }).from(playersTable);
    const [{ value: totalOrders }] = await db.select({ value: count() }).from(ordersTable);
    const [{ value: totalAnnouncements }] = await db.select({ value: count() }).from(announcementsTable);
    const [{ value: totalStaff }] = await db.select({ value: count() }).from(adminUsersTable);

    const [{ value: pendingOrders }] = await db.select({ value: count() }).from(ordersTable).where(eq(ordersTable.status, "pending"));
    const [{ value: completedOrders }] = await db.select({ value: count() }).from(ordersTable).where(eq(ordersTable.status, "completed"));
    const [{ value: cancelledOrders }] = await db.select({ value: count() }).from(ordersTable).where(eq(ordersTable.status, "cancelled"));
    const [{ value: confirmedOrders }] = await db.select({ value: count() }).from(ordersTable).where(eq(ordersTable.status, "confirmed"));

    const recentOrders = await db.select().from(ordersTable).orderBy(ordersTable.createdAt).limit(5);
    const recentPlayers = await db.select({
      id: playersTable.id,
      username: playersTable.username,
      minecraftUsername: playersTable.minecraftUsername,
      createdAt: playersTable.createdAt,
    }).from(playersTable).orderBy(playersTable.createdAt).limit(5);

    res.json({
      totalPlayers,
      totalOrders,
      totalAnnouncements,
      totalStaff,
      ordersByStatus: { pending: pendingOrders, confirmed: confirmedOrders, completed: completedOrders, cancelled: cancelledOrders },
      recentOrders,
      recentPlayers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
