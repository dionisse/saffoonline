/*
# Create publications table

1. New Tables
- `publications`
  - `id` (uuid, primary key)
  - `title` (text, not null)
  - `content` (text, not null)
  - `image_url` (text, nullable)
  - `link_url` (text, nullable)
  - `active` (boolean, default true)
  - `created_at`, `updated_at` (timestamptz)

2. Security
- RLS enabled.
- SELECT ouvert à tous (anon + authenticated).
- INSERT / UPDATE / DELETE réservés aux utilisateurs authentifiés
  (le contrôle admin est géré côté UI via canAccess()).
*/

CREATE TABLE IF NOT EXISTS publications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL,
  content    text        NOT NULL,
  image_url  text,
  link_url   text,
  active     boolean     NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE publications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_publications" ON publications;
CREATE POLICY "public_select_publications" ON publications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_publications" ON publications;
CREATE POLICY "auth_insert_publications" ON publications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_publications" ON publications;
CREATE POLICY "auth_update_publications" ON publications FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_publications" ON publications;
CREATE POLICY "auth_delete_publications" ON publications FOR DELETE
  TO authenticated USING (true);
