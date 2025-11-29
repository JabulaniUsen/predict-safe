-- Migration: Add 'correct_score' to predictions.plan_type check constraint
-- This allows correct score predictions to be stored in the predictions table

-- Drop the existing check constraint
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_plan_type_check;

-- Add the new check constraint with 'correct_score' included
ALTER TABLE predictions ADD CONSTRAINT predictions_plan_type_check 
  CHECK (plan_type IN ('profit_multiplier', 'daily_2_odds', 'standard', 'free', 'correct_score'));

