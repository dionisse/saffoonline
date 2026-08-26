INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 10485760,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/avif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_product_images"  ON storage.objects;
DROP POLICY IF EXISTS "admin_insert_product_images" ON storage.objects;
DROP POLICY IF EXISTS "admin_delete_product_images" ON storage.objects;
CREATE POLICY "public_read_product_images"  ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-images');
CREATE POLICY "admin_insert_product_images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_delete_product_images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
