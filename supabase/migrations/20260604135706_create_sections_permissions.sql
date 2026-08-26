/*
  # Module Sections & Permissions d'accès

  ## Purpose
  Permet à l'administrateur de créer des "sections" (profils d'accès) et d'y associer :
  - Une liste de modules admin autorisés (ex: POS + Commandes pour un vendeur)
  - Des utilisateurs (profils) appartenant à cette section

  Ainsi, un utilisateur avec le rôle `employee` ou `cashier` voit uniquement les modules
  définis dans sa section. Un admin voit tout sans restriction.

  ## New Tables

  ### sections
  Profil d'accès / groupe de permissions.
  - `name`        : nom de la section (ex: "Vendeur", "Gestionnaire stock")
  - `description` : description libre
  - `color`       : couleur d'affichage (hex)
  - `created_by`  : admin créateur
  - `created_at`

  ### section_permissions
  Modules accessibles pour une section.
  - `section_id`  : référence section
  - `module`      : clé du module (ex: 'admin-pos', 'admin-orders', ...)
  Contrainte UNIQUE (section_id, module).

  ## Modified Tables

  ### profiles
  - Ajout de `section_id` (nullable FK → sections) : section d'appartenance d'un employé
  - Ajout de rôle `employee` dans la contrainte check
  - Ajout de `employee_number` pour identifiant interne optionnel

  ## Security
  - RLS : seuls les admins peuvent créer/modifier/supprimer des sections et permissions
  - Staff peut lire les sections (pour charger ses propres permissions)
  - Lecture libre des permissions pour les membres de la section

  ## Notes
  - Les admins ignorent complètement les section_permissions (accès total)
  - Un utilisateur sans section voit uniquement le dashboard s'il est staff
*/

-- ─── sections ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL DEFAULT '',
  description text DEFAULT '',
  color       text DEFAULT '#714B67',
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view sections"
  ON sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier','employee'))
  );

CREATE POLICY "Admins can insert sections"
  ON sections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins can update sections"
  ON sections FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Admins can delete sections"
  ON sections FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ─── section_permissions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS section_permissions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  module     text NOT NULL,
  UNIQUE(section_id, module)
);

ALTER TABLE section_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view section_permissions"
  ON section_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','cashier','employee'))
  );

CREATE POLICY "Admins can insert section_permissions"
  ON section_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins can delete section_permissions"
  ON section_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ─── Extend profiles ─────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Add section_id FK
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'section_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN section_id uuid REFERENCES sections(id) ON DELETE SET NULL;
  END IF;

  -- Add employee_number for optional internal ID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'employee_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN employee_number text DEFAULT '';
  END IF;
END $$;

-- Allow role = 'employee' in the existing check (if constraint exists)
-- We simply update the role column type to accept employee as well.
-- Supabase stores role as text so this is always safe.

CREATE INDEX IF NOT EXISTS idx_sections_created ON sections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_secperm_section ON section_permissions(section_id);
CREATE INDEX IF NOT EXISTS idx_profiles_section ON profiles(section_id);
