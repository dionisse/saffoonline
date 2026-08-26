ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_style text NOT NULL DEFAULT 'auto';
-- 'auto' = dark fallback si pas de bannière, 'none' = rien (vide) si pas de bannière