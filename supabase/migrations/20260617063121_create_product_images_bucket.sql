-- Create the product-images storage bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read
CREATE POLICY "public_read_product_images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'product-images');

-- Allow authenticated admins to upload
CREATE POLICY "admin_insert_product_images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Allow authenticated admins to delete
CREATE POLICY "admin_delete_product_images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
