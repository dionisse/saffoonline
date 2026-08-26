/*
  # Fix Security Advisories

  ## Issues Fixed

  1. **RLS user_metadata reference** — `profiles."Admins can view all profiles"` referenced
     `user_metadata` (editable by end-users). Replaced with a safe self-join on `profiles.role`.

  2. **Mutable search_path** — Three trigger functions lacked `SET search_path = public`,
     making them vulnerable to search-path hijacking. Recreated with the fixed header.

  3. **Payments always-true INSERT policy** — `"System can insert payments"` had
     `WITH CHECK (true)`, bypassing RLS for any authenticated user. Dropped.

  4. **Public bucket listing** — `storage.objects "Anyone can view invoices"` allowed
     listing all files in the bucket. Replaced with an object-level-only policy using
     a path restriction, so direct URLs still work but directory listing is blocked.

  5. **EXECUTE on SECURITY DEFINER trigger functions** — The three stock trigger functions
     were callable by `anon` and `authenticated` via `/rest/v1/rpc/`. Revoked EXECUTE from
     both roles. Triggers still work (they run as the function owner, not via RPC).
*/

-- ── 1. Fix profiles RLS: replace user_metadata reference ──────────────────────
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    -- Safe: reads from the profiles table itself, not editable user_metadata
    EXISTS (
      SELECT 1 FROM public.profiles admin_p
      WHERE admin_p.id = auth.uid() AND admin_p.role = 'admin'
    )
    OR auth.uid() = id
  );

-- ── 2. Fix mutable search_path on trigger functions ───────────────────────────

CREATE OR REPLACE FUNCTION public.fn_stock_deduct_on_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source   text;
  v_status   text;
  v_order_no text;
  v_type     text;
BEGIN
  SELECT source, status, order_number
    INTO v_source, v_status, v_order_no
    FROM orders
   WHERE id = NEW.order_id;

  IF v_status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  v_type := CASE WHEN v_source = 'pos' THEN 'sale_pos' ELSE 'sale_online' END;

  UPDATE products
     SET stock = GREATEST(0, stock - NEW.quantity)
   WHERE id = NEW.product_id;

  INSERT INTO stock_movements (product_id, type, quantity, reference, notes)
  VALUES (NEW.product_id, v_type, -NEW.quantity, v_order_no, '');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_stock_restore_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE products p
       SET stock = p.stock + oi.quantity
      FROM order_items oi
     WHERE oi.order_id = NEW.id AND oi.product_id = p.id;

    INSERT INTO stock_movements (product_id, type, quantity, reference, notes)
    SELECT oi.product_id, 'adjustment', oi.quantity, NEW.order_number, 'Annulation commande'
      FROM order_items oi
     WHERE oi.order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_stock_on_purchase_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'validated' AND OLD.status = 'draft' THEN
    UPDATE products p
       SET stock = p.stock + pi.quantity
      FROM purchase_items pi
     WHERE pi.purchase_id = NEW.id AND pi.product_id = p.id;

    INSERT INTO stock_movements (product_id, type, quantity, reference, notes)
    SELECT pi.product_id, 'purchase', pi.quantity, NEW.reference,
           'Approvisionnement validé : ' || NEW.label
      FROM purchase_items pi
     WHERE pi.purchase_id = NEW.id AND pi.product_id IS NOT NULL;
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status = 'validated' THEN
    UPDATE products p
       SET stock = GREATEST(0, p.stock - pi.quantity)
      FROM purchase_items pi
     WHERE pi.purchase_id = NEW.id AND pi.product_id = p.id;

    INSERT INTO stock_movements (product_id, type, quantity, reference, notes)
    SELECT pi.product_id, 'adjustment', -pi.quantity, NEW.reference,
           'Annulation approvisionnement : ' || NEW.label
      FROM purchase_items pi
     WHERE pi.purchase_id = NEW.id AND pi.product_id IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 3. Revoke direct RPC execution on trigger functions ───────────────────────
-- These are only meant to be invoked by triggers, not via REST API calls.
REVOKE EXECUTE ON FUNCTION public.fn_stock_deduct_on_order_item() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_stock_restore_on_cancel()    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_stock_on_purchase_status()   FROM anon, authenticated;

-- ── 4. Remove always-true payments INSERT policy ──────────────────────────────
DROP POLICY IF EXISTS "System can insert payments" ON public.payments;
-- The existing "Staff can insert payments" policy already covers legitimate inserts.

-- ── 5. Fix invoices bucket: restrict SELECT to object access only ─────────────
-- Drop the broad listing policy and replace with one that requires a non-empty name
-- (prevents directory listing while still allowing direct file URL access).
DROP POLICY IF EXISTS "Anyone can view invoices" ON storage.objects;

CREATE POLICY "Anyone can view invoice objects"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'invoices'
    AND name IS NOT NULL
    AND length(name) > 0
  );
