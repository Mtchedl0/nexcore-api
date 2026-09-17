import { Router } from "express";
import { pool } from "../../lib/db/src/index.js";
import { requireAuth, requireOwner } from "../middlewares/auth.js";

const router = Router();

const DEFAULT_FORM_CONFIG = {
  fields: [
    { id: "minecraftUsername", label: "Minecraft Username", type: "text", placeholder: "e.g. Steve", required: true, active: true, core: true },
    { id: "discordUsername", label: "Discord Username", type: "text", placeholder: "e.g. steve#0001", required: true, active: true, core: true },
    { id: "age", label: "Age", type: "text", placeholder: "e.g. 16", required: true, active: true, core: false },
    { id: "timezone", label: "Timezone", type: "select", placeholder: "", required: true, active: true, core: false },
    { id: "hoursPerWeek", label: "Hours per week", type: "text", placeholder: "e.g. 10-15 hours", required: false, active: true, core: false },
    { id: "whyApply", label: "Why do you want to be staff?", type: "textarea", placeholder: "Tell us why you want to join the team and what makes you a good fit...", required: true, active: true, core: false },
    { id: "experience", label: "Previous staff experience", type: "textarea", placeholder: "List any previous Minecraft staff experience, server names, roles, etc.", required: false, active: true, core: false },
  ],
};

const FIXED_FIELD_MAP: Record<string, string> = {
  minecraftUsername: "minecraft_username",
  discordUsername: "discord_username",
  age: "age",
  timezone: "timezone",
  hoursPerWeek: "hours_per_week",
  whyApply: "why_apply",
  experience: "experience",
};

router.get("/status", async (_req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT staff_apps_open FROM site_settings LIMIT 1");
    res.json({ open: rows[0]?.staff_apps_open ?? false });
  } catch { res.json({ open: false }); }
  finally { client.release(); }
});

router.get("/check", async (req, res) => {
  const username = req.query.username?.toString().trim();
  if (!username) return res.status(400).json({ error: "Username required" });
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, status, submitted_at FROM staff_applications
       WHERE LOWER(minecraft_username) = LOWER($1)
       ORDER BY submitted_at DESC LIMIT 1`,
      [username]
    );
    if (!rows[0]) return res.json({ found: false });
    res.json({ found: true, status: rows[0].status, submittedAt: rows[0].submitted_at });
  } catch { res.status(500).json({ error: "Server error" }); }
  finally { client.release(); }
});

router.get("/form", async (_req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT staff_form_config FROM site_settings LIMIT 1");
    const raw = rows[0]?.staff_form_config;
    if (raw) {
      try { return res.json(JSON.parse(raw)); } catch {}
    }
    res.json(DEFAULT_FORM_CONFIG);
  } catch { res.json(DEFAULT_FORM_CONFIG); }
  finally { client.release(); }
});

router.put("/form", requireAuth, requireOwner, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("UPDATE site_settings SET staff_form_config = $1", [JSON.stringify(req.body)]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save form config." });
  } finally { client.release(); }
});

router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows: cfg } = await client.query("SELECT staff_apps_open, staff_form_config FROM site_settings LIMIT 1");
    if (!cfg[0]?.staff_apps_open) return res.status(403).json({ error: "Staff applications are currently closed." });

    let formConfig = DEFAULT_FORM_CONFIG;
    if (cfg[0]?.staff_form_config) {
      try { formConfig = JSON.parse(cfg[0].staff_form_config); } catch {}
    }

    const body = req.body;
    const customAnswers: Record<string, string> = {};

    for (const field of formConfig.fields) {
      if (!field.active) continue;
      if (field.required && !body[field.id]?.toString().trim()) {
        return res.status(400).json({ error: `"${field.label}" is required.` });
      }
      if (!FIXED_FIELD_MAP[field.id]) {
        customAnswers[field.id] = body[field.id]?.toString().trim() || "";
      }
    }

    const minecraftUsername = body.minecraftUsername?.toString().trim() || "";
    const discordUsername = body.discordUsername?.toString().trim() || "";
    if (!minecraftUsername || !discordUsername) {
      return res.status(400).json({ error: "Minecraft username and Discord username are required." });
    }

    const { rows: existing } = await client.query(
      "SELECT status FROM staff_applications WHERE LOWER(minecraft_username) = LOWER($1) LIMIT 1",
      [minecraftUsername]
    );
    if (existing[0]) {
      return res.status(409).json({
        error: "An application for this Minecraft username already exists.",
        existingStatus: existing[0].status,
      });
    }

    await client.query(
      `INSERT INTO staff_applications
        (minecraft_username, discord_username, age, timezone, why_apply, experience, hours_per_week, custom_answers)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        minecraftUsername,
        discordUsername,
        body.age?.toString().trim() || "",
        body.timezone?.toString().trim() || "",
        body.whyApply?.toString().trim() || "",
        body.experience?.toString().trim() || "",
        body.hoursPerWeek?.toString().trim() || "",
        JSON.stringify(customAnswers),
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit application." });
  } finally { client.release(); }
});

router.get("/", requireAuth, async (_req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT * FROM staff_applications ORDER BY submitted_at DESC");
    res.json(rows);
  } finally { client.release(); }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { status, adminNotes } = req.body;
    const { rows } = await client.query(
      `UPDATE staff_applications SET
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
    await client.query("UPDATE site_settings SET staff_apps_open = $1", [!!open]);
    res.json({ ok: true, open: !!open });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle." });
  } finally { client.release(); }
});

export default router;
