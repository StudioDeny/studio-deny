-- ============================================================
-- Migration: announcement_bars had every seed row duplicated (10 rows,
-- 5 distinct messages, each present twice with identical message/
-- position/colors) — almost certainly a seed script that ran twice
-- without an ON CONFLICT guard. Keeps the lower-id copy of each exact
-- duplicate, drops the rest. Not the reason edits "don't reflect" on
-- the site (every row -- duplicated or not -- is currently is_active =
-- false, so AnnouncementBar.tsx's `.eq("is_active", true)` query
-- returns nothing and it silently falls back to its own hardcoded
-- default text instead — that's a data/content state, not a bug, and
-- not touched here).
-- ============================================================

DELETE FROM announcement_bars a
USING announcement_bars b
WHERE a.id > b.id
  AND a.message = b.message
  AND a.position = b.position
  AND a.bg_color = b.bg_color
  AND a.text_color = b.text_color;
