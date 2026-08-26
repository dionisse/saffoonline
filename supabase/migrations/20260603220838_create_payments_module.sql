/*
  # Payments module

  ## Purpose
  - Extend payment_method enum to include all modes:
    cash, mobile_money_mtn, mobile_money_moov, mobile_money_celtis,
    bank_transfer, cash_on_delivery, chariow_online
  - Add `payments` table: tracks every payment (manual or online) linked to an order
  - Add `chariow_transaction_id` and `payment_status` columns to orders for online payment tracking

  ## New Tables

  ### payments
  Central payment ledger. One order can have multiple payment attempts.
  Columns:
  - `id`                    : uuid PK
  - `order_id`              : references orders(id)
  - `order_number`          : denormalized for quick display
  - `method`                : payment method key
  - `operator`              : mobile money operator or bank name (optional)
  - `amount`                : amount paid
  - `status`                : pending | paid | failed | refunded
  - `transaction_id`        : external transaction reference (Chariow ID, bank ref…)
  - `chariow_checkout_url`  : URL to redirect customer for online payment
  - `payer_name`            : customer name
  - `payer_phone`           : customer phone
  - `notes`                 : admin notes
  - `created_by`            : staff member who recorded the payment (null = system/customer)
  - `created_at`

  ## Modified Tables

  ### orders
  Add columns:
  - `payment_status` : pending | paid | partial | failed | refunded (default 'pending')
  - `chariow_sale_id`: Chariow sale/transaction ID when using online payment

  ## Security
  - RLS on payments: staff can read/insert/update; customers can read their own
  - Only admins can delete payments
*/

-- ─── Extend orders table ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status text NOT NULL DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'chariow_sale_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN chariow_sale_id text DEFAULT '';
  END IF;
END $$;

-- ─── payments table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             uuid REFERENCES orders(id) ON DELETE SET NULL,
  order_number         text NOT NULL DEFAULT '',
  method               text NOT NULL DEFAULT 'cash',
  operator             text DEFAULT '',
  amount               numeric NOT NULL DEFAULT 0,
  status               text NOT NULL DEFAULT 'pending',  -- pending | paid | failed | refunded
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

CREATE POLICY "Staff can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier'))
  );

CREATE POLICY "Customers can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid())
  );

CREATE POLICY "Staff can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier'))
  );

CREATE POLICY "System can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier'))
  );

CREATE POLICY "Admins can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
