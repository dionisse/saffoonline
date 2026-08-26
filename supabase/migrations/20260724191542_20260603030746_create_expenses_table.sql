CREATE TABLE IF NOT EXISTS expenses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label      text NOT NULL DEFAULT '',
  category   text NOT NULL DEFAULT 'autres',
  amount     numeric NOT NULL DEFAULT 0,
  date       date NOT NULL DEFAULT CURRENT_DATE,
  notes      text DEFAULT '',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view expenses"   ON expenses;
DROP POLICY IF EXISTS "Staff can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Staff can update expenses" ON expenses;
DROP POLICY IF EXISTS "Admins can delete expenses" ON expenses;
CREATE POLICY "Staff can view expenses" ON expenses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')));
CREATE POLICY "Staff can insert expenses" ON expenses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')));
CREATE POLICY "Staff can update expenses" ON expenses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')));
CREATE POLICY "Admins can delete expenses" ON expenses FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
