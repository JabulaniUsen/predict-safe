-- Ensure RLS on transactions doesn't silently block admin actions.
-- Run via `supabase db push` (applied as postgres owner).
-- Idempotent: safe to run multiple times.
--
-- Why this exists: the admin panel confirms/rejects/activates/deletes
-- transactions. Those writes run through /api/admin/transactions with the
-- service-role client (which bypasses RLS), but when SUPABASE_SERVICE_ROLE_KEY
-- is not configured the app falls back to the admin's own JWT — which needs
-- these policies. Without an UPDATE/DELETE policy, Confirm appears to do
-- nothing: the transaction stays 'pending' and the pending indicator never
-- moves. (Checkout inserts work with just the INSERT policy, which is why
-- payments pile up as pending while Confirm fails — the exact symptom.)
--
-- NOTE about storage-style "must be owner" errors: unlike storage.objects,
-- these policies CAN be created in the SQL Editor too, but prefer migrations.

-- Users can insert their own payment records (checkout + activation modal).
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
CREATE POLICY "Users can insert their own transactions"
ON transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own payment records.
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions"
ON transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can link their transaction to their subscription after creating it
-- (checkout sets subscription_id in a follow-up update).
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
CREATE POLICY "Users can update their own transactions"
ON transactions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can do everything with transactions.
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
CREATE POLICY "Admins can view all transactions"
ON transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins can update all transactions" ON transactions;
CREATE POLICY "Admins can update all transactions"
ON transactions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins can delete transactions" ON transactions;
CREATE POLICY "Admins can delete transactions"
ON transactions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);
