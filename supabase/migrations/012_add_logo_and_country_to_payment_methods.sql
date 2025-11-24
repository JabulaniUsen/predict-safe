-- Add logo_url and country fields to payment_methods table
ALTER TABLE payment_methods 
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Create index for country filtering
CREATE INDEX IF NOT EXISTS idx_payment_methods_country ON payment_methods(country);

-- Update RLS policy to filter by country when available
-- Users should see payment methods for their country or payment methods without country restriction
DROP POLICY IF EXISTS "Active payment methods are viewable by everyone" ON payment_methods;
CREATE POLICY "Active payment methods are viewable by everyone" ON payment_methods
  FOR SELECT USING (
    is_active = true AND (
      country IS NULL OR 
      country = (SELECT country FROM users WHERE id = auth.uid())
    )
  );

