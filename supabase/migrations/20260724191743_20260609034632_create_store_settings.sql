CREATE TABLE IF NOT EXISTS store_settings (
  id int PRIMARY KEY DEFAULT 1,
  store_name text NOT NULL DEFAULT 'BrasseriePro',
  logo_url text DEFAULT NULL,
  company_name text DEFAULT NULL,
  rccm text DEFAULT NULL,
  ifu text DEFAULT NULL,
  whatsapp_number text DEFAULT NULL,
  phone_number text DEFAULT NULL,
  facebook_url text DEFAULT NULL,
  tiktok_url text DEFAULT NULL,
  whatsapp_url text DEFAULT NULL,
  legal_mentions text DEFAULT NULL,
  terms_of_use text DEFAULT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row_check CHECK (id = 1)
);
INSERT INTO store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_store_settings"  ON store_settings;
DROP POLICY IF EXISTS "admin_update_store_settings" ON store_settings;
CREATE POLICY "public_read_store_settings"  ON store_settings FOR SELECT TO public USING (true);
CREATE POLICY "admin_update_store_settings" ON store_settings FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
