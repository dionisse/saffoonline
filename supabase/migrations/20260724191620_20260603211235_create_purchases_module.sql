CREATE TABLE IF NOT EXISTS purchases (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference         text NOT NULL DEFAULT '',
  label             text NOT NULL DEFAULT '',
  invoice_reference text DEFAULT '',
  supplier_name     text DEFAULT '',
  date              date NOT NULL DEFAULT CURRENT_DATE,
  status            text NOT NULL DEFAULT 'draft',
  invoice_url       text DEFAULT '',
  notes             text DEFAULT '',
  total_amount      numeric NOT NULL DEFAULT 0,
  created_by        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view purchases"   ON purchases;
DROP POLICY IF EXISTS "Staff can insert purchases" ON purchases;
DROP POLICY IF EXISTS "Admins can update purchases" ON purchases;
DROP POLICY IF EXISTS "Admins can delete purchases" ON purchases;
CREATE POLICY "Staff can view purchases"    ON purchases FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')));
CREATE POLICY "Staff can insert purchases"  ON purchases FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')));
CREATE POLICY "Admins can update purchases" ON purchases FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admins can delete purchases" ON purchases FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE TABLE IF NOT EXISTS purchase_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id  uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id   uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL DEFAULT '',
  unit_price   numeric NOT NULL DEFAULT 0,
  quantity     integer NOT NULL DEFAULT 1,
  subtotal     numeric GENERATED ALWAYS AS (unit_price * quantity) STORED,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view purchase items"   ON purchase_items;
DROP POLICY IF EXISTS "Staff can insert purchase items" ON purchase_items;
DROP POLICY IF EXISTS "Admins can update purchase items" ON purchase_items;
DROP POLICY IF EXISTS "Admins can delete purchase items" ON purchase_items;
CREATE POLICY "Staff can view purchase items"    ON purchase_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')));
CREATE POLICY "Staff can insert purchase items"  ON purchase_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')));
CREATE POLICY "Admins can update purchase items" ON purchase_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admins can delete purchase items" ON purchase_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE OR REPLACE FUNCTION public.fn_stock_on_purchase_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'validated' AND OLD.status = 'draft' THEN
    UPDATE products p SET stock = p.stock + pi.quantity FROM purchase_items pi WHERE pi.purchase_id = NEW.id AND pi.product_id = p.id;
    INSERT INTO stock_movements (product_id, type, quantity, reference, notes) SELECT pi.product_id, 'purchase', pi.quantity, NEW.reference, 'Approvisionnement validé : ' || NEW.label FROM purchase_items pi WHERE pi.purchase_id = NEW.id AND pi.product_id IS NOT NULL;
  END IF;
  IF NEW.status = 'cancelled' AND OLD.status = 'validated' THEN
    UPDATE products p SET stock = GREATEST(0, p.stock - pi.quantity) FROM purchase_items pi WHERE pi.purchase_id = NEW.id AND pi.product_id = p.id;
    INSERT INTO stock_movements (product_id, type, quantity, reference, notes) SELECT pi.product_id, 'adjustment', -pi.quantity, NEW.reference, 'Annulation approvisionnement : ' || NEW.label FROM purchase_items pi WHERE pi.purchase_id = NEW.id AND pi.product_id IS NOT NULL;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_stock_on_purchase_status ON purchases;
CREATE TRIGGER trg_stock_on_purchase_status AFTER UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION fn_stock_on_purchase_status();

CREATE INDEX IF NOT EXISTS idx_purchases_date     ON purchases(date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_status   ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
