-- Fix: use current_user_is_admin for profiles admin policy (will be defined next migration)
-- For now: recreate with non-recursive subquery
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);  -- temporary; overwritten in next migration

REVOKE EXECUTE ON FUNCTION public.fn_stock_deduct_on_order_item() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_stock_restore_on_cancel()    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_stock_on_purchase_status()   FROM anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view invoice objects" ON storage.objects;
CREATE POLICY "Anyone can view invoice objects" ON storage.objects FOR SELECT
  USING (bucket_id = 'invoices' AND name IS NOT NULL AND length(name) > 0);
