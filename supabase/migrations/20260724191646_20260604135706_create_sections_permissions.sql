CREATE TABLE IF NOT EXISTS sections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL DEFAULT '',
  description text DEFAULT '',
  color       text DEFAULT '#714B67',
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view sections"   ON sections;
DROP POLICY IF EXISTS "Admins can insert sections" ON sections;
DROP POLICY IF EXISTS "Admins can update sections" ON sections;
DROP POLICY IF EXISTS "Admins can delete sections" ON sections;
CREATE POLICY "Staff can view sections"    ON sections FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier','employee')));
CREATE POLICY "Admins can insert sections" ON sections FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admins can update sections" ON sections FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admins can delete sections" ON sections FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE TABLE IF NOT EXISTS section_permissions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  module     text NOT NULL,
  UNIQUE(section_id, module)
);
ALTER TABLE section_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view section_permissions"   ON section_permissions;
DROP POLICY IF EXISTS "Admins can insert section_permissions" ON section_permissions;
DROP POLICY IF EXISTS "Admins can delete section_permissions" ON section_permissions;
CREATE POLICY "Staff can view section_permissions"    ON section_permissions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier','employee')));
CREATE POLICY "Admins can insert section_permissions" ON section_permissions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admins can delete section_permissions" ON section_permissions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='section_id') THEN
    ALTER TABLE profiles ADD COLUMN section_id uuid REFERENCES sections(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='employee_number') THEN
    ALTER TABLE profiles ADD COLUMN employee_number text DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sections_created  ON sections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_secperm_section   ON section_permissions(section_id);
CREATE INDEX IF NOT EXISTS idx_profiles_section  ON profiles(section_id);
