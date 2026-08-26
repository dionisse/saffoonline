/*
# Add per-product stock tracking toggle

## Purpose
Allows the admin to enable or disable stock tracking on individual products.
When stock tracking is disabled for a product:
- The product is always available for purchase (no "out of stock" state)
- Quantity is not capped by stock numbers
- The product is excluded from stock alerts and inventory value calculations
- Stock movements are not required for that product

This is useful for digital products, made-to-order items, or products with
unlimited supply where tracking stock quantity is unnecessary.

## 1. Modified Tables

### products
- Added `track_stock` (boolean, NOT NULL, default true)
  - `true` = stock is tracked (current behavior, backward compatible)
  - `false` = stock tracking disabled, product always available

### product_options
- Added `track_stock` (boolean, NOT NULL, default true)
  - Same semantics per option variant. When a product has options,
    each option can independently toggle stock tracking.
  - For simplicity, the admin toggle on the product level controls the
    overall behavior; option-level toggle is available for fine-grained control.

## 2. Security
- No new policies needed — existing product RLS policies cover the new column.
- The column is writable by admins (via existing product UPDATE policy).
- Readable by all (via existing product SELECT policy).

## 3. Important Notes
1. Default is `true` — all existing products continue to track stock as before.
2. The frontend uses this field to decide whether to enforce stock limits.
3. When `track_stock = false`, the stock field still exists in the DB but
   is ignored by the application logic.
*/

-- Add track_stock to products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'track_stock'
  ) THEN
    ALTER TABLE products ADD COLUMN track_stock boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add track_stock to product_options
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_options' AND column_name = 'track_stock'
  ) THEN
    ALTER TABLE product_options ADD COLUMN track_stock boolean NOT NULL DEFAULT true;
  END IF;
END $$;