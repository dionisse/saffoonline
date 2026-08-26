/*
# Create Promo Codes Module for Sales Partners

## Purpose
A promo code system for salespeople (commerciaux) and business introducers (apporteurs d'affaire).
When a partner shares their promo code with clients who shop online, the partner earns a commission
(5% or 10%) on the client's purchases. Promo codes have validity periods and are renewable.

## 1. New Tables

### `promo_codes`
- `id` (uuid, PK) — unique identifier
- `code` (text, unique, not null) — the promo code string clients enter at checkout
- `partner_name` (text, not null) — name of the salesperson or business introducer
- `partner_phone` (text) — contact phone for the partner
- `partner_email` (text) — contact email for the partner
- `partner_type` (text, not null, default 'commercial') — 'commercial' or 'apporteur'
- `commission_rate` (numeric, not null, default 5) — commission percentage the partner earns (e.g., 5 or 10)
- `discount_type` (text, not null, default 'percentage') — type of discount the CLIENT receives: 'percentage' or 'fixed'
- `discount_value` (numeric, not null, default 0) — discount value the client receives (percentage or fixed amount)
- `min_order_amount` (numeric, not null, default 0) — minimum order total required to use this code
- `max_uses` (integer) — max number of times the code can be used (null = unlimited)
- `used_count` (integer, not null, default 0) — how many times the code has been used
- `starts_at` (timestamptz) — when the code becomes valid (null = immediately)
- `ends_at` (timestamptz) — when the code expires (null = never expires)
- `is_active` (boolean, not null, default true) — can be deactivated without deleting
- `notes` (text) — admin notes about this partner or code
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### `promo_usages`
Tracks each time a promo code is applied to an order, with commission calculation.
- `id` (uuid, PK)
- `promo_code_id` (uuid, FK → promo_codes, ON DELETE CASCADE)
- `order_id` (uuid, FK → orders, ON DELETE CASCADE)
- `code` (text, not null) — denormalized code string for quick display
- `partner_name` (text) — denormalized partner name for quick display
- `order_total` (numeric, not null) — the order total AFTER discount (what the client paid)
- `discount_amount` (numeric, not null, default 0) — the discount amount given to the client
- `commission_rate` (numeric, not null) — the commission rate at time of usage
- `commission_amount` (numeric, not null, default 0) — the commission earned by the partner
- `commission_status` (text, not null, default 'pending') — 'pending' or 'paid'
- `created_at` (timestamptz, default now())

## 2. Security (RLS)

### promo_codes
- SELECT: visible to anon + authenticated (checkout needs to validate codes for guests and logged-in users)
- INSERT/UPDATE/DELETE: admin only (via role check on profiles)

### promo_usages
- SELECT: admin only (contains sensitive commission data)
- INSERT: anon + authenticated (checkout records usage when order is placed)
- UPDATE/DELETE: admin only

## 3. Indexes
- Unique index on `promo_codes.code` (case-insensitive via UPPER)
- Index on `promo_usages.promo_code_id` for commission reports
- Index on `promo_usages.order_id` for order lookups
- Index on `promo_usages.commission_status` for pending commission queries

## 4. Important Notes
1. The `used_count` is incremented by the frontend after a successful order. In a high-concurrency
   scenario a stored procedure would be safer, but for this e-commerce volume client-side increment is acceptable.
2. Commission is calculated on the post-discount order total (what the client actually pays).
3. Promo codes are renewable by updating `ends_at` to a new future date.
4. The `partner_type` field distinguishes between 'commercial' (5% commission) and 'apporteur' (10% commission),
   but the actual rate is configurable per code via `commission_rate`.
*/

-- ─── promo_codes table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,
  partner_name    text NOT NULL,
  partner_phone   text,
  partner_email   text,
  partner_type    text NOT NULL DEFAULT 'commercial',
  commission_rate numeric NOT NULL DEFAULT 5,
  discount_type   text NOT NULL DEFAULT 'percentage',
  discount_value  numeric NOT NULL DEFAULT 0,
  min_order_amount numeric NOT NULL DEFAULT 0,
  max_uses        integer,
  used_count      integer NOT NULL DEFAULT 0,
  starts_at       timestamptz,
  ends_at         timestamptz,
  is_active       boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive unique index on code
CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_code_upper_idx
  ON promo_codes (UPPER(code));

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Anyone (including guest checkout) can look up a code to validate it
DROP POLICY IF EXISTS "read_promo_codes" ON promo_codes;
CREATE POLICY "read_promo_codes" ON promo_codes
  FOR SELECT TO anon, authenticated USING (true);

-- Admin-only CRUD
DROP POLICY IF EXISTS "admin_insert_promo_codes" ON promo_codes;
CREATE POLICY "admin_insert_promo_codes" ON promo_codes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "admin_update_promo_codes" ON promo_codes;
CREATE POLICY "admin_update_promo_codes" ON promo_codes
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "admin_delete_promo_codes" ON promo_codes;
CREATE POLICY "admin_delete_promo_codes" ON promo_codes
  FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ─── promo_usages table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_usages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id    uuid NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  order_id         uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  code             text NOT NULL,
  partner_name     text,
  order_total      numeric NOT NULL,
  discount_amount  numeric NOT NULL DEFAULT 0,
  commission_rate  numeric NOT NULL,
  commission_amount numeric NOT NULL DEFAULT 0,
  commission_status text NOT NULL DEFAULT 'pending',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS promo_usages_promo_code_id_idx ON promo_usages(promo_code_id);
CREATE INDEX IF NOT EXISTS promo_usages_order_id_idx ON promo_usages(order_id);
CREATE INDEX IF NOT EXISTS promo_usages_commission_status_idx ON promo_usages(commission_status);

ALTER TABLE promo_usages ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT (commission data is sensitive)
DROP POLICY IF EXISTS "admin_select_promo_usages" ON promo_usages;
CREATE POLICY "admin_select_promo_usages" ON promo_usages
  FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Anyone placing an order can record a promo usage
DROP POLICY IF EXISTS "insert_promo_usages" ON promo_usages;
CREATE POLICY "insert_promo_usages" ON promo_usages
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admin-only UPDATE (to mark commissions as paid)
DROP POLICY IF EXISTS "admin_update_promo_usages" ON promo_usages;
CREATE POLICY "admin_update_promo_usages" ON promo_usages
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Admin-only DELETE
DROP POLICY IF EXISTS "admin_delete_promo_usages" ON promo_usages;
CREATE POLICY "admin_delete_promo_usages" ON promo_usages
  FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ─── updated_at trigger for promo_codes ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_promo_codes_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS promo_codes_updated_at ON promo_codes;
CREATE TRIGGER promo_codes_updated_at
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_promo_codes_updated_at();