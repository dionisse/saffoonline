CREATE TABLE public.brands (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view brands"   ON public.brands;
DROP POLICY IF EXISTS "Admins can insert brands" ON public.brands;
DROP POLICY IF EXISTS "Admins can update brands" ON public.brands;
DROP POLICY IF EXISTS "Admins can delete brands" ON public.brands;
CREATE POLICY "Anyone can view brands"   ON public.brands FOR SELECT USING (true);
CREATE POLICY "Admins can insert brands" ON public.brands FOR INSERT TO authenticated WITH CHECK (public.current_user_is_admin());
CREATE POLICY "Admins can update brands" ON public.brands FOR UPDATE TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "Admins can delete brands" ON public.brands FOR DELETE TO authenticated USING (public.current_user_is_admin());

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;

CREATE TABLE public.product_option_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view option groups"   ON public.product_option_groups;
DROP POLICY IF EXISTS "Admins can insert option groups" ON public.product_option_groups;
DROP POLICY IF EXISTS "Admins can update option groups" ON public.product_option_groups;
DROP POLICY IF EXISTS "Admins can delete option groups" ON public.product_option_groups;
CREATE POLICY "Anyone can view option groups"   ON public.product_option_groups FOR SELECT USING (true);
CREATE POLICY "Admins can insert option groups" ON public.product_option_groups FOR INSERT TO authenticated WITH CHECK (public.current_user_is_admin());
CREATE POLICY "Admins can update option groups" ON public.product_option_groups FOR UPDATE TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "Admins can delete option groups" ON public.product_option_groups FOR DELETE TO authenticated USING (public.current_user_is_admin());

CREATE TABLE public.product_options (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id       uuid NOT NULL REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
  label          text NOT NULL,
  price_modifier numeric(12,2) DEFAULT 0 NOT NULL,
  sort_order     integer DEFAULT 0 NOT NULL,
  created_at     timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view options"   ON public.product_options;
DROP POLICY IF EXISTS "Admins can insert options" ON public.product_options;
DROP POLICY IF EXISTS "Admins can update options" ON public.product_options;
DROP POLICY IF EXISTS "Admins can delete options" ON public.product_options;
CREATE POLICY "Anyone can view options"   ON public.product_options FOR SELECT USING (true);
CREATE POLICY "Admins can insert options" ON public.product_options FOR INSERT TO authenticated WITH CHECK (public.current_user_is_admin());
CREATE POLICY "Admins can update options" ON public.product_options FOR UPDATE TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "Admins can delete options" ON public.product_options FOR DELETE TO authenticated USING (public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.fn_auto_sku()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prefix text; candidate text; counter integer := 0;
BEGIN
  IF NEW.sku IS NULL OR trim(NEW.sku) = '' THEN
    prefix := upper(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '', 'g'));
    prefix := left(prefix, 4);
    IF prefix = '' THEN prefix := 'PRD'; END IF;
    LOOP
      candidate := prefix || '-' || lpad((floor(random() * 90000 + 10000))::int::text, 5, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM products WHERE sku = candidate);
      counter := counter + 1;
      IF counter > 100 THEN candidate := prefix || '-' || lpad(((extract(epoch FROM clock_timestamp()) * 1000)::bigint % 100000)::text, 5, '0'); EXIT; END IF;
    END LOOP;
    NEW.sku := candidate;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_sku ON public.products;
CREATE TRIGGER trg_auto_sku BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.fn_auto_sku();
