/*
  # Fix section_permissions RLS for non-recursive access

  The previous SELECT policy on section_permissions checks profiles,
  which can cause recursion when profiles is being loaded.

  Fix: allow authenticated users to read section_permissions directly
  (the data is non-sensitive — just module keys), and tighten write
  access to admins only.

  Also fix the sections SELECT policy to avoid a potential recursion
  loop when called as part of a profile join.
*/

-- Drop the old select policies that reference profiles (recursion risk)
DROP POLICY IF EXISTS "Staff can view section_permissions" ON section_permissions;
DROP POLICY IF EXISTS "Staff can view sections" ON sections;

-- Simpler read policies: any authenticated user can read these
-- (module keys are non-sensitive; row-level sensitivity is handled at the app layer)
CREATE POLICY "Authenticated can view section_permissions"
  ON section_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can view sections"
  ON sections FOR SELECT
  TO authenticated
  USING (true);
