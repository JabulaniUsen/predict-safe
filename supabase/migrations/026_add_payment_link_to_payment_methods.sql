-- Add optional payment link/URL field to payment_methods table
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS payment_link TEXT;
