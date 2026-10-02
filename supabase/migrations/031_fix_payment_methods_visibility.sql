-- 031: fix payment methods that never appear for users.
--
-- Root causes:
-- 1. The public SELECT policy filtered by country at the DB level using a
--    join against public.users. For logged-out users, users with a NULL
--    country, or any case where the join misfires, newly added methods were
--    invisible even though the app already filters by country in memory
--    (checkout / subscribe / activation modal). Country filtering belongs in
--    the app, not in RLS.
-- 2. Rows saved with countries = NULL (instead of '[]') behaved
--    inconsistently between the policy and the client filters.
--
-- This migration:
--  - ensures the columns the admin UI writes exist,
--  - normalises countries NULL -> '[]' (empty = all countries),
--  - simplifies the public policy to "active methods are viewable by
--    everyone" so every active method reaches the user, and
--  - re-ensures the admin write policies exist.

-- Columns the admin UI writes (safe no-ops if already applied)
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS countries JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_link TEXT;

-- Make sure every payment type the UI offers is allowed
ALTER TABLE payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_type_check;

ALTER TABLE payment_methods
  ADD CONSTRAINT payment_methods_type_check
  CHECK (type IN ('bank_transfer', 'crypto', 'mobile_money', 'skrill', 'paypal', 'other'));

-- Normalise: empty/unknown availability is '[]', never NULL or JSON null
UPDATE payment_methods
SET countries = '[]'::jsonb
WHERE countries IS NULL OR countries = 'null'::jsonb;

-- Public read: every active method is visible; the app filters by country.
DROP POLICY IF EXISTS "Active payment methods are viewable by everyone" ON payment_methods;
CREATE POLICY "Active payment methods are viewable by everyone" ON payment_methods
  FOR SELECT USING (is_active = true);

-- Admin full access (re-ensure)
DROP POLICY IF EXISTS "Admins can view all payment methods" ON payment_methods;
CREATE POLICY "Admins can view all payment methods" ON payment_methods
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can insert payment methods" ON payment_methods;
CREATE POLICY "Admins can insert payment methods" ON payment_methods
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can update payment methods" ON payment_methods;
CREATE POLICY "Admins can update payment methods" ON payment_methods
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can delete payment methods" ON payment_methods;
CREATE POLICY "Admins can delete payment methods" ON payment_methods
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
