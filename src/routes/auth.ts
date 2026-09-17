import { Router } from "express";
import { db } from "../../lib/db/src/index.js";
import { adminUsersTable } from "../../lib/db/src/schema/index.js";
import { eq, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signToken, requireAuth, requireOwner } from "../middlewares/auth.js";
import type { Request } from "express";
import type { AdminPayload } from "../middlewares/auth.js";

const router = Router();
type AuthReq = Request & { admin?: AdminPayload };

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) { res.status(400).json({ error: "username and password required" }); return; }
    const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.username, username)).limit(1);
    if (!user) { res.status(401).json({ error: "Invalid credentials" }); return; }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Invalid credentials" }); return; }
    const token = signToken({ id: user.id, username: user.username, role: user.role });
    res.json({ token, username: user.username, role: user.role });
  } catch (err) { console.error(err); res.status(500).json({ error: "Login failed" }); }
});

router.post("/register", requireAuth, requireOwner, async (req: AuthReq, res) => {
  try {
    const { username, password, role = "staff" } = req.body;
    if (!username || !password) { res.status(400).json({ error: "username and password required" }); return; }
    const validRoles = ["owner", "co-owner", "admin", "staff"];
    if (!validRoles.includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }
    const hash = await bcrypt.hash(password, 10);
    const [created] = await db.insert(adminUsersTable)
      .values({ username, passwordHash: hash, role })
      .returning({ id: adminUsersTable.id, username: adminUsersTable.username, role: adminUsersTable.role });
    res.status(201).json(created);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) res.status(409).json({ error: "Username already exists" });
    else res.status(500).json({ error: "Failed to create user" });
  }
});

router.get("/me", requireAuth, (req: AuthReq, res) => { res.json(req.admin); });

router.get("/public-staff", async (_req, res) => {
  try {
    const users = await db.select({
      id: adminUsersTable.id,
      username: adminUsersTable.username,
      role: adminUsersTable.role,
      avatarUrl: adminUsersTable.avatarUrl,
    }).from(adminUsersTable).orderBy(adminUsersTable.id);
    res.json(users);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to fetch staff" }); }
});

router.get("/users", requireAuth, requireOwner, async (_req, res) => {
  try {
    const users = await db.select({
      id: adminUsersTable.id,
      username: adminUsersTable.username,
      role: adminUsersTable.role,
      createdAt: adminUsersTable.createdAt,
    }).from(adminUsersTable);
    res.json(users);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to fetch users" }); }
});

router.patch("/users/:id", requireAuth, requireOwner, async (req: AuthReq, res) => {
  try {
    const id = Number(req.params.id);
    const { role, password, username } = req.body;
    const validRoles = ["owner", "co-owner", "admin", "staff"];
    if (role && !validRoles.includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }

    const updates: Record<string, unknown> = {};
    if (role) updates.role = role;
    if (username) {
      if (username.trim().length < 2) { res.status(400).json({ error: "Username too short" }); return; }
      updates.username = username.trim();
    }
    if (password) {
      if (password.length < 6) { res.status(400).json({ error: "Password too short" }); return; }
      updates.passwordHash = await bcrypt.hash(password, 10);
    }
    if ("avatarUrl" in req.body) updates.avatarUrl = req.body.avatarUrl || null;

    const [updated] = await db.update(adminUsersTable).set(updates).where(eq(adminUsersTable.id, id)).returning({
      id: adminUsersTable.id, username: adminUsersTable.username, role: adminUsersTable.role, avatarUrl: adminUsersTable.avatarUrl,
    });
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to update user" }); }
});

router.delete("/users/:id", requireAuth, requireOwner, async (req: AuthReq, res) => {
  try {
    const id = Number(req.params.id);
    if (req.admin?.id === id) { res.status(400).json({ error: "Cannot delete your own account" }); return; }
    const [deleted] = await db.delete(adminUsersTable).where(eq(adminUsersTable.id, id)).returning({ id: adminUsersTable.id });
    if (!deleted) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to delete user" }); }
});

router.post("/change-password", requireAuth, async (req: AuthReq, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) { res.status(400).json({ error: "Both passwords required" }); return; }
    if (newPassword.length < 6) { res.status(400).json({ error: "New password must be at least 6 characters" }); return; }

    const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, req.admin!.id)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Current password is incorrect" }); return; }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.update(adminUsersTable).set({ passwordHash: hash }).where(eq(adminUsersTable.id, req.admin!.id));
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to change password" }); }
});

export default router;
