import { Router } from "express";
import { pool } from "../../lib/db/src/index.js";
import { requireAuth, requireOwner } from "../middlewares/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT * FROM rules WHERE active = true ORDER BY display_order ASC, id ASC");
    res.json(rows);
  } finally { client.release(); }
});

router.get("/all", requireAuth, requireOwner, async (_req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT * FROM rules ORDER BY display_order ASC, id ASC");
    res.json(rows);
  } finally { client.release(); }
});

router.post("/", requireAuth, requireOwner, async (req, res) => {
  const client = await pool.connect();
  try {
    const { category, rule, displayOrder } = req.body;
    if (!category?.trim() || !rule?.trim()) return res.status(400).json({ error: "Category and rule are required." });
    const { rows } = await client.query(
      "INSERT INTO rules (category, rule, display_order) VALUES ($1, $2, $3) RETURNING *",
      [category.trim(), rule.trim(), displayOrder ?? 0]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create rule." });
  } finally { client.release(); }
});

router.patch("/:id", requireAuth, requireOwner, async (req, res) => {
  const client = await pool.connect();
  try {
    const { category, rule, displayOrder, active } = req.body;
    const { rows } = await client.query(
      `UPDATE rules SET
        category = CASE WHEN $1::text IS NOT NULL THEN $1 ELSE category END,
        rule = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE rule END,
        display_order = CASE WHEN $3::int IS NOT NULL THEN $3 ELSE display_order END,
        active = CASE WHEN $4::boolean IS NOT NULL THEN $4 ELSE active END
       WHERE id = $5 RETURNING *`,
      [category ?? null, rule ?? null, displayOrder ?? null, active ?? null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update rule." });
  } finally { client.release(); }
});

router.delete("/:id", requireAuth, requireOwner, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM rules WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete." });
  } finally { client.release(); }
});

export default router;
