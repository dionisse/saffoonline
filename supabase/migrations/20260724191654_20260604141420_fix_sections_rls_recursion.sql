DROP POLICY IF EXISTS "Staff can view section_permissions" ON section_permissions;
DROP POLICY IF EXISTS "Staff can view sections" ON sections;
CREATE POLICY "Authenticated can view section_permissions" ON section_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can view sections" ON sections FOR SELECT TO authenticated USING (true);
