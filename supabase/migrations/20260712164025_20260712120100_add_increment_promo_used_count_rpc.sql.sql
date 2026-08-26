/*
# Add increment_promo_used_count RPC function

## Purpose
Atomically increments the `used_count` column of a promo code when it is used at checkout.
This avoids race conditions where two concurrent checkouts could read the same count
and both write count+1, losing one increment.

## Changes
1. Creates `increment_promo_used_count(promo_id uuid)` function
2. Grants execute to `anon` and `authenticated` roles (checkout needs to call it)

## Security
- The function only increments `used_count` — it does not return sensitive data
- Callable by anon + authenticated since checkout may be guest or logged-in
*/

CREATE OR REPLACE FUNCTION increment_promo_used_count(promo_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE promo_codes
  SET used_count = used_count + 1
  WHERE id = promo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_promo_used_count(uuid) TO anon, authenticated;