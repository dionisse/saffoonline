/*
# Base tables: profiles, categories, products, orders, order_items

Creates the core tables that all subsequent migrations depend on.
*/

-- ─── profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text NOT NULL DEFAULT '',
  role       text NOT NULL DEFAULT 'customer',
  phone      text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.fn_create_profile_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'customer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_profile_on_signup ON auth.users;
CREATE TRIGGER trg_create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_create_profile_on_signup();

-- ─── categories ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL DEFAULT '',
  description text DEFAULT '',
  image_url   text DEFAULT '',
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_categories"  ON categories;
DROP POLICY IF EXISTS "admin_manage_categories" ON categories;

CREATE POLICY "public_read_categories"
  ON categories FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin_insert_categories" ON categories FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ─── products ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         uuid REFERENCES categories(id) ON DELETE SET NULL,
  name                text NOT NULL DEFAULT '',
  description         text DEFAULT '',
  price               numeric NOT NULL DEFAULT 0,
  bulk_quantity       integer NOT NULL DEFAULT 1,
  bulk_price          numeric NOT NULL DEFAULT 0,
  stock               integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  image_url           text DEFAULT '',
  sku                 text DEFAULT '',
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_products"   ON products;

CREATE POLICY "public_read_products"
  ON products FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "admin_insert_products" ON products FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','cashier'));
CREATE POLICY "admin_update_products" ON products FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','cashier'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','cashier'));
CREATE POLICY "admin_delete_products" ON products FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "staff_read_all_products" ON products FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','cashier','employee'));

-- ─── orders ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     text NOT NULL DEFAULT '',
  customer_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name    text NOT NULL DEFAULT '',
  customer_phone   text NOT NULL DEFAULT '',
  total            numeric NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'pending',
  payment_method   text NOT NULL DEFAULT 'cash',
  source           text NOT NULL DEFAULT 'online',
  delivery_address text DEFAULT '',
  delivery_assignee text DEFAULT '',
  notes            text DEFAULT '',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own orders"  ON orders;
DROP POLICY IF EXISTS "Anon can insert orders"         ON orders;
DROP POLICY IF EXISTS "Staff can view all orders"      ON orders;
DROP POLICY IF EXISTS "Staff can update orders"        ON orders;
DROP POLICY IF EXISTS "Admins can delete orders"       ON orders;

CREATE POLICY "Customers can view own orders" ON orders FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Anon can insert orders" ON orders FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can view all orders" ON orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier','employee')));

CREATE POLICY "Staff can update orders" ON orders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier')));

CREATE POLICY "Admins can delete orders" ON orders FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- ─── order_items ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL DEFAULT '',
  quantity     integer NOT NULL DEFAULT 1,
  unit_price   numeric NOT NULL DEFAULT 0,
  subtotal     numeric GENERATED ALWAYS AS (unit_price * quantity) STORED
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own order items" ON order_items;
DROP POLICY IF EXISTS "Anon can insert order items"        ON order_items;
DROP POLICY IF EXISTS "Staff can view all order items"     ON order_items;

CREATE POLICY "Customers can view own order items" ON order_items FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid()));

CREATE POLICY "Anon can insert order items" ON order_items FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can view all order items" ON order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier','employee')));

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
