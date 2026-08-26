/*
  # Fix infinite recursion in profiles RLS

  The previous migration replaced the user_metadata check with a self-join on profiles,
  which created infinite recursion: the RLS policy on profiles queried profiles again.

  Fix: create a SECURITY DEFINER helper function that reads the caller's role while
  bypassing RLS (it runs as the database owner). The policy then calls this function
  instead of querying profiles directly.
*/

-- Helper function that checks if the current user is admin, bypassing RLS
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Revoke direct call from untrusted roles (only used internally via policies)
REVOKE EXECUTE ON FUNCTION public.current_user_is_admin() FROM anon, authenticated;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate using the SECURITY DEFINER function — no recursion
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR auth.uid() = id
  );
