import { Router } from "express";
import { pool } from "../../lib/db/src/index.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

/* ── Public: list active partners ── */
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, platform, channel_url, subscriber_count, avatar_url, description, display_order
       FROM partners WHERE active = true ORDER BY display_order ASC, id ASC`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

/* ── Auth: list all partners ── */
router.get("/all", requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM partners ORDER BY display_order ASC, id ASC`);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

/* ── Auth: create partner ── */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, platform, channelUrl, subscriberCount, avatarUrl, description, displayOrder } = req.body;
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    const { rows } = await pool.query(
      `INSERT INTO partners (name, platform, channel_url, subscriber_count, avatar_url, description, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, platform || "YouTube", channelUrl || "", subscriberCount || "", avatarUrl || "", description || "", displayOrder ?? 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

/* ── Auth: update partner ── */
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { name, platform, channelUrl, subscriberCount, avatarUrl, description, displayOrder, active } = req.body;
    const { rows } = await pool.query(
      `UPDATE partners SET
        name = COALESCE($1, name), platform = COALESCE($2, platform),
        channel_url = COALESCE($3, channel_url), subscriber_count = COALESCE($4, subscriber_count),
        avatar_url = COALESCE($5, avatar_url), description = COALESCE($6, description),
        display_order = COALESCE($7, display_order), active = COALESCE($8, active)
       WHERE id = $9 RETURNING *`,
      [name, platform, channelUrl, subscriberCount, avatarUrl, description, displayOrder, active, req.params.id]
    );
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

/* ── Auth: delete partner ── */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM partners WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

/* ── Public: application status ── */
router.get("/applications/status", async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT partner_apps_open FROM site_settings LIMIT 1`);
    res.json({ open: rows[0]?.partner_apps_open ?? false });
  } catch { res.json({ open: false }); }
});

/* ── Public: submit application ── */
router.post("/applications", async (req, res) => {
  try {
    const { name, discord, channelUrl, platform, subscriberCount, contentType, whyPartner, additionalInfo } = req.body;
    if (!name || !channelUrl) { res.status(400).json({ error: "name and channelUrl required" }); return; }
    const { rows: st } = await pool.query(`SELECT partner_apps_open FROM site_settings LIMIT 1`);
    if (!st[0]?.partner_apps_open) { res.status(403).json({ error: "Applications are currently closed" }); return; }
    const { rows } = await pool.query(
      `INSERT INTO partner_applications (name, discord, channel_url, platform, subscriber_count, content_type, why_partner, additional_info)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, submitted_at`,
      [name, discord || "", channelUrl, platform || "YouTube", subscriberCount || "", contentType || "", whyPartner || "", additionalInfo || ""]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

/* ── Auth: list all applications ── */
router.get("/applications", requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM partner_applications ORDER BY submitted_at DESC`);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

/* ── Auth: update application ── */
router.patch("/applications/:id", requireAuth, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const { rows } = await pool.query(
      `UPDATE partner_applications SET status = COALESCE($1, status), admin_notes = COALESCE($2, admin_notes) WHERE id = $3 RETURNING *`,
      [status, adminNotes, req.params.id]
    );
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

/* ── Auth: toggle applications open/closed ── */
router.post("/applications/toggle", requireAuth, async (req, res) => {
  try {
    const { open } = req.body;
    await pool.query(`UPDATE site_settings SET partner_apps_open = $1`, [open]);
    res.json({ open });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

export default router;
