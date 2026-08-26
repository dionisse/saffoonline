/*
# Add subcategory support (parent_id on categories)

1. Modified Tables
- `categories`
  - Added `parent_id` (uuid, nullable) — self-referencing FK to `categories.id`.
  - When NULL, the category is a top-level (parent) category.
  - When set, the category is a subcategory of the referenced parent.
  - ON DELETE SET NULL: deleting a parent detaches children rather than cascading.

2. Security
- No RLS policy changes — the existing policies on `categories` already cover the new column.
- No new tables.

3. Notes
- This is a non-destructive, additive change: existing categories get `parent_id = NULL` (top-level).
- Products continue to reference `category_id` which can now point to either a parent or a subcategory.
- An index is added on `parent_id` for efficient child lookups.
*/

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
