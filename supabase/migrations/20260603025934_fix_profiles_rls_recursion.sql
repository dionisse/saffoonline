/*
  # Fix infinite recursion in profiles RLS policies

  The "Admins can view all profiles" policy was querying the profiles table
  from within a profiles policy, causing infinite recursion.

  Fix: replace the recursive subquery with auth.jwt() to read the role
  directly from the JWT metadata, which avoids any table lookup.
*/

-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Recreate it using JWT metadata (no table lookup = no recursion)
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
