DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_status') THEN
    ALTER TABLE orders ADD COLUMN payment_status text NOT NULL DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='chariow_sale_id') THEN
    ALTER TABLE orders ADD COLUMN chariow_sale_id text DEFAULT '';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             uuid REFERENCES orders(id) ON DELETE SET NULL,
  order_number         text NOT NULL DEFAULT '',
  method               text NOT NULL DEFAULT 'cash',
  operator             text DEFAULT '',
  amount               numeric NOT NULL DEFAULT 0,
  status               text NOT NULL DEFAULT 'pending',
  transaction_id       text DEFAULT '',
  chariow_checkout_url text DEFAULT '',
  payer_name           text DEFAULT '',
  payer_phone          text DEFAULT '',
  notes                text DEFAULT '',
  created_by           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view all payments"     ON payments;
DROP POLICY IF EXISTS "Customers can view own payments" ON payments;
DROP POLICY IF EXISTS "Staff can insert payments"       ON payments;
DROP POLICY IF EXISTS "Staff can update payments"       ON payments;
DROP POLICY IF EXISTS "Admins can delete payments"      ON payments;
CREATE POLICY "Staff can view all payments"     ON payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')));
CREATE POLICY "Customers can view own payments" ON payments FOR SELECT TO authenticated USING (order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid()));
CREATE POLICY "Staff can insert payments"       ON payments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')));
CREATE POLICY "Staff can update payments"       ON payments FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')));
CREATE POLICY "Admins can delete payments"      ON payments FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE INDEX IF NOT EXISTS idx_payments_order   ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status  ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_method  ON payments(method);
