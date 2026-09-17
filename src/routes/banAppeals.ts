import { Router } from "express";
import { pool } from "../../lib/db/src/index.js";
import { requireAuth, requireOwner } from "../middlewares/auth.js";

const router = Router();

router.get("/status", async (_req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT ban_appeals_open FROM site_settings LIMIT 1");
    res.json({ open: rows[0]?.ban_appeals_open ?? false });
  } catch { res.json({ open: false }); }
  finally { client.release(); }
});

router.get("/check", async (req, res) => {
  const username = req.query.username?.toString().trim();
  if (!username) return res.status(400).json({ error: "Username required" });
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, status, submitted_at FROM ban_appeals
       WHERE LOWER(minecraft_username) = LOWER($1)
       ORDER BY submitted_at DESC LIMIT 1`,
      [username]
    );
    if (!rows[0]) return res.json({ found: false });
    res.json({ found: true, status: rows[0].status, submittedAt: rows[0].submitted_at });
  } catch { res.status(500).json({ error: "Server error" }); }
  finally { client.release(); }
});

router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows: cfg } = await client.query("SELECT ban_appeals_open FROM site_settings LIMIT 1");
    if (!cfg[0]?.ban_appeals_open) return res.status(403).json({ error: "Ban appeals are currently closed." });

    const { minecraftUsername, discordUsername, banReason, appealReason, additionalInfo } = req.body;
    if (!minecraftUsername?.trim()) return res.status(400).json({ error: "Minecraft username is required." });
    if (!discordUsername?.trim()) return res.status(400).json({ error: "Discord username is required." });
    if (!banReason?.trim()) return res.status(400).json({ error: "Please describe what you were banned for." });
    if (!appealReason?.trim()) return res.status(400).json({ error: "Please explain why you should be unbanned." });

    const { rows: existing } = await client.query(
      "SELECT status FROM ban_appeals WHERE LOWER(minecraft_username) = LOWER($1) LIMIT 1",
      [minecraftUsername.trim()]
    );
    if (existing[0]) {
      return res.status(409).json({
        error: "An appeal for this Minecraft username already exists.",
        existingStatus: existing[0].status,
      });
    }

    await client.query(
      `INSERT INTO ban_appeals (minecraft_username, discord_username, ban_reason, appeal_reason, additional_info)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        minecraftUsername.trim(),
        discordUsername.trim(),
        banReason.trim(),
        appealReason.trim(),
        additionalInfo?.trim() || "",
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit appeal." });
  } finally { client.release(); }
});

router.get("/", requireAuth, async (_req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT * FROM ban_appeals ORDER BY submitted_at DESC");
    res.json(rows);
  } finally { client.release(); }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { status, adminNotes } = req.body;
    const { rows } = await client.query(
      `UPDATE ban_appeals SET
        status = CASE WHEN $1::text IS NOT NULL THEN $1 ELSE status END,
        admin_notes = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE admin_notes END
       WHERE id = $3 RETURNING *`,
      [status ?? null, adminNotes ?? null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update." });
  } finally { client.release(); }
});

router.post("/toggle", requireAuth, requireOwner, async (req, res) => {
  const client = await pool.connect();
  try {
    const { open } = req.body;
    await client.query("UPDATE site_settings SET ban_appeals_open = $1", [!!open]);
    res.json({ ok: true, open: !!open });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle." });
  } finally { client.release(); }
});

export default router;
