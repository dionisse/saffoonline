CREATE TABLE IF NOT EXISTS stock_movements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type       text NOT NULL DEFAULT 'adjustment',
  quantity   integer NOT NULL,
  reference  text DEFAULT '',
  notes      text DEFAULT '',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view stock movements"   ON stock_movements;
DROP POLICY IF EXISTS "Staff can insert stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Admins can update stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Admins can delete stock movements" ON stock_movements;
CREATE POLICY "Staff can view stock movements"   ON stock_movements FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')));
CREATE POLICY "Staff can insert stock movements" ON stock_movements FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')));
CREATE POLICY "Admins can update stock movements" ON stock_movements FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admins can delete stock movements" ON stock_movements FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE TABLE IF NOT EXISTS stock_periods (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label  text NOT NULL DEFAULT '',
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  opening_stock integer NOT NULL DEFAULT 0,
  closing_stock integer NOT NULL DEFAULT 0,
  total_in      integer NOT NULL DEFAULT 0,
  total_damaged integer NOT NULL DEFAULT 0,
  sold_qty      integer GENERATED ALWAYS AS (opening_stock + total_in - closing_stock - total_damaged) STORED,
  created_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE stock_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view stock periods"   ON stock_periods;
DROP POLICY IF EXISTS "Admins can insert stock periods" ON stock_periods;
DROP POLICY IF EXISTS "Admins can update stock periods" ON stock_periods;
DROP POLICY IF EXISTS "Admins can delete stock periods" ON stock_periods;
CREATE POLICY "Staff can view stock periods"    ON stock_periods FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')));
CREATE POLICY "Admins can insert stock periods" ON stock_periods FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admins can update stock periods" ON stock_periods FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admins can delete stock periods" ON stock_periods FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE OR REPLACE FUNCTION public.fn_stock_deduct_on_order_item()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_source text; v_status text; v_order_no text; v_type text;
BEGIN
  SELECT source, status, order_number INTO v_source, v_status, v_order_no FROM orders WHERE id = NEW.order_id;
  IF v_status = 'cancelled' THEN RETURN NEW; END IF;
  v_type := CASE WHEN v_source = 'pos' THEN 'sale_pos' ELSE 'sale_online' END;
  UPDATE products SET stock = GREATEST(0, stock - NEW.quantity) WHERE id = NEW.product_id;
  INSERT INTO stock_movements (product_id, type, quantity, reference, notes) VALUES (NEW.product_id, v_type, -NEW.quantity, v_order_no, '');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_stock_deduct_on_order_item ON order_items;
CREATE TRIGGER trg_stock_deduct_on_order_item AFTER INSERT ON order_items FOR EACH ROW EXECUTE FUNCTION fn_stock_deduct_on_order_item();

CREATE OR REPLACE FUNCTION public.fn_stock_restore_on_cancel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE products p SET stock = p.stock + oi.quantity FROM order_items oi WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
    INSERT INTO stock_movements (product_id, type, quantity, reference, notes) SELECT oi.product_id, 'adjustment', oi.quantity, NEW.order_number, 'Annulation commande' FROM order_items oi WHERE oi.order_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_stock_restore_on_cancel ON orders;
CREATE TRIGGER trg_stock_restore_on_cancel AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION fn_stock_restore_on_cancel();

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_periods_product   ON stock_periods(product_id);
