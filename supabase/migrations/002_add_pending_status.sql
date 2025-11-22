-- Migration: Add 'pending' status to user_subscriptions
-- This allows subscriptions to be in a pending state while waiting for admin payment confirmation

-- Update the check constraint to include 'pending' status
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_plan_status_check;

ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_plan_status_check 
CHECK (plan_status IN ('inactive', 'pending', 'pending_activation', 'active', 'expired'));

