/*
# Add remaining columns and promo codes module

1. store_settings: add hero_style, whatsapp_notify_number, callmebot_api_key
2. categories: add parent_id for subcategories
3. products: add track_stock toggle
4. product_options: add track_stock toggle
5. Create promo_codes and promo_usages tables + RPC
*/

-- ── store_settings columns ───────────────────────────────────────────────────
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_style text NOT NULL DEFAULT 'auto';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS whatsapp_notify_number text DEFAULT NULL;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS callmebot_api_key text DEFAULT NULL;

-- ── categories: parent_id for subcategories ────────────────────────────────────
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- ── track_stock on products ───────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='track_stock') THEN
    ALTER TABLE products ADD COLUMN track_stock boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ── track_stock on product_options ────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_options' AND column_name='track_stock') THEN
    ALTER TABLE product_options ADD COLUMN track_stock boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ── promo_codes table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text UNIQUE NOT NULL,
  partner_name     text NOT NULL,
  partner_phone    text,
  partner_email    text,
  partner_type     text NOT NULL DEFAULT 'commercial',
  commission_rate  numeric NOT NULL DEFAULT 5,
  discount_type    text NOT NULL DEFAULT 'percentage',
  discount_value   numeric NOT NULL DEFAULT 0,
  min_order_amount numeric NOT NULL DEFAULT 0,
  max_uses         integer,
  used_count       integer NOT NULL DEFAULT 0,
  starts_at        timestamptz,
  ends_at          timestamptz,
  is_active        boolean NOT NULL DEFAULT true,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_code_upper_idx ON promo_codes (UPPER(code));
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_promo_codes"           ON promo_codes;
DROP POLICY IF EXISTS "admin_insert_promo_codes"   ON promo_codes;
DROP POLICY IF EXISTS "admin_update_promo_codes"   ON promo_codes;
DROP POLICY IF EXISTS "admin_delete_promo_codes"   ON promo_codes;
CREATE POLICY "read_promo_codes"         ON promo_codes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_insert_promo_codes" ON promo_codes FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_update_promo_codes" ON promo_codes FOR UPDATE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_delete_promo_codes" ON promo_codes FOR DELETE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ── promo_usages table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_usages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id     uuid NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  order_id          uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  code              text NOT NULL,
  partner_name      text,
  order_total       numeric NOT NULL,
  discount_amount   numeric NOT NULL DEFAULT 0,
  commission_rate   numeric NOT NULL,
  commission_amount numeric NOT NULL DEFAULT 0,
  commission_status text NOT NULL DEFAULT 'pending',
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS promo_usages_promo_code_id_idx     ON promo_usages(promo_code_id);
CREATE INDEX IF NOT EXISTS promo_usages_order_id_idx          ON promo_usages(order_id);
CREATE INDEX IF NOT EXISTS promo_usages_commission_status_idx ON promo_usages(commission_status);
ALTER TABLE promo_usages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_select_promo_usages" ON promo_usages;
DROP POLICY IF EXISTS "insert_promo_usages"       ON promo_usages;
DROP POLICY IF EXISTS "admin_update_promo_usages" ON promo_usages;
DROP POLICY IF EXISTS "admin_delete_promo_usages" ON promo_usages;
CREATE POLICY "admin_select_promo_usages" ON promo_usages FOR SELECT TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "insert_promo_usages"       ON promo_usages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin_update_promo_usages" ON promo_usages FOR UPDATE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_delete_promo_usages" ON promo_usages FOR DELETE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ── updated_at trigger for promo_codes ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_promo_codes_updated_at()
RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS promo_codes_updated_at ON promo_codes;
CREATE TRIGGER promo_codes_updated_at BEFORE UPDATE ON promo_codes FOR EACH ROW EXECUTE FUNCTION update_promo_codes_updated_at();

-- ── increment_promo_used_count RPC ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_promo_used_count(promo_id uuid)
RETURNS void AS $$ BEGIN UPDATE promo_codes SET used_count = used_count + 1 WHERE id = promo_id; END; $$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION increment_promo_used_count(uuid) TO anon, authenticated;
