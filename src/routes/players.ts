import { Router } from "express";
import { db } from "../../lib/db/src/index.js";
import { playersTable } from "../../lib/db/src/schema/index.js";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signPlayerToken, requirePlayer } from "../middlewares/playerAuth.js";
import { requireAuth, signToken } from "../middlewares/auth.js";
import type { Request } from "express";
import type { PlayerPayload } from "../middlewares/playerAuth.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { username, password, minecraftUsername, email } = req.body;
    if (!username || !password || !minecraftUsername) {
      res.status(400).json({ error: "username, password and minecraftUsername are required" });
      return;
    }
    if (username.length < 3 || username.length > 50) {
      res.status(400).json({ error: "Username must be 3–50 characters" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const [created] = await db
      .insert(playersTable)
      .values({ username, passwordHash: hash, minecraftUsername, email: email || null })
      .returning({
        id: playersTable.id,
        username: playersTable.username,
        minecraftUsername: playersTable.minecraftUsername,
        role: playersTable.role,
      });

    const token = signPlayerToken({ id: created.id, username: created.username, minecraftUsername: created.minecraftUsername, role: created.role ?? "player" });
    res.status(201).json({ token, username: created.username, minecraftUsername: created.minecraftUsername, role: created.role ?? "player" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) {
      res.status(409).json({ error: "Username already taken" });
    } else {
      console.error(err);
      res.status(500).json({ error: "Registration failed" });
    }
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "username and password required" });
      return;
    }

    const [player] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.username, username))
      .limit(1);

    if (!player) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (player.suspended) {
      res.status(403).json({ error: "Your account has been suspended. Contact an admin." });
      return;
    }

    const valid = await bcrypt.compare(password, player.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const role = player.role ?? "player";
    const token = signPlayerToken({ id: player.id, username: player.username, minecraftUsername: player.minecraftUsername, role });
    res.json({ token, username: player.username, minecraftUsername: player.minecraftUsername, role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", requirePlayer, (req: Request & { player?: PlayerPayload }, res) => {
  res.json(req.player);
});

/* Claim an admin JWT if the player has admin or owner role */
router.post("/claim-admin", requirePlayer, (req: Request & { player?: PlayerPayload }, res) => {
  const player = req.player!;
  if (player.role !== "admin" && player.role !== "owner") {
    res.status(403).json({ error: "Insufficient role" });
    return;
  }
  const adminToken = signToken({ id: player.id, username: player.username, role: player.role });
  res.json({ token: adminToken });
});

router.get("/", requireAuth, async (_req, res) => {
  try {
    const players = await db.select({
      id: playersTable.id,
      username: playersTable.username,
      minecraftUsername: playersTable.minecraftUsername,
      email: playersTable.email,
      suspended: playersTable.suspended,
      role: playersTable.role,
      createdAt: playersTable.createdAt,
    }).from(playersTable).orderBy(desc(playersTable.createdAt));
    res.json(players);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to fetch players" }); }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [player] = await db.select({
      id: playersTable.id,
      username: playersTable.username,
      minecraftUsername: playersTable.minecraftUsername,
      email: playersTable.email,
      suspended: playersTable.suspended,
      role: playersTable.role,
      createdAt: playersTable.createdAt,
    }).from(playersTable).where(eq(playersTable.id, id)).limit(1);
    if (!player) { res.status(404).json({ error: "Player not found" }); return; }
    res.json(player);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to fetch player" }); }
});

router.patch("/:id/role", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body;
    const valid = ["player", "mod", "admin", "owner"];
    if (!role || !valid.includes(role)) {
      res.status(400).json({ error: `Role must be one of: ${valid.join(", ")}` });
      return;
    }
    const [updated] = await db.update(playersTable).set({ role }).where(eq(playersTable.id, id)).returning({
      id: playersTable.id, username: playersTable.username, minecraftUsername: playersTable.minecraftUsername,
      email: playersTable.email, suspended: playersTable.suspended, role: playersTable.role, createdAt: playersTable.createdAt,
    });
    if (!updated) { res.status(404).json({ error: "Player not found" }); return; }
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to update role" }); }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { minecraftUsername, email, newPassword } = req.body;
    const updates: Record<string, unknown> = {};
    if (minecraftUsername !== undefined) updates.minecraftUsername = minecraftUsername;
    if (email !== undefined) updates.email = email || null;
    if (newPassword) {
      if (newPassword.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }
      updates.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    const [updated] = await db.update(playersTable).set(updates).where(eq(playersTable.id, id)).returning({
      id: playersTable.id,
      username: playersTable.username,
      minecraftUsername: playersTable.minecraftUsername,
      email: playersTable.email,
      suspended: playersTable.suspended,
      role: playersTable.role,
      createdAt: playersTable.createdAt,
    });
    if (!updated) { res.status(404).json({ error: "Player not found" }); return; }
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to update player" }); }
});

router.patch("/:id/suspend", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [current] = await db.select({ suspended: playersTable.suspended }).from(playersTable).where(eq(playersTable.id, id)).limit(1);
    if (!current) { res.status(404).json({ error: "Player not found" }); return; }
    const [updated] = await db.update(playersTable).set({ suspended: !current.suspended }).where(eq(playersTable.id, id)).returning({
      id: playersTable.id,
      username: playersTable.username,
      minecraftUsername: playersTable.minecraftUsername,
      email: playersTable.email,
      suspended: playersTable.suspended,
      role: playersTable.role,
      createdAt: playersTable.createdAt,
    });
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to toggle suspend" }); }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [deleted] = await db.delete(playersTable).where(eq(playersTable.id, id)).returning({ id: playersTable.id });
    if (!deleted) { res.status(404).json({ error: "Player not found" }); return; }
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to delete player" }); }
});

export default router;
