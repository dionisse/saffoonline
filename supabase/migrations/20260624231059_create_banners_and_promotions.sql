-- ── Banners ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banners (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text,
  subtitle     text,
  image_url    text NOT NULL,
  cta_text     text,
  cta_action   text,
  sort_order   integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_banners" ON banners
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "admin_all_banners" ON banners
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ── Promotions ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  subtitle     text,
  badge_text   text,
  badge_color  text NOT NULL DEFAULT 'red',
  image_url    text,
  cta_text     text,
  cta_action   text,
  sort_order   integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  ends_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_promotions" ON promotions
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "admin_all_promotions" ON promotions
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
