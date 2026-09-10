-- Rename Profit Multiplier plan to Daily 50 Odds Combo
-- Keeps predictions.plan_type = 'profit_multiplier' unchanged for backward compatibility
-- Only renames the user-facing plan in the plans table and adds the new slug.

UPDATE plans
SET
  name = 'Daily 50 Odds Combo',
  slug = 'daily-50-odds-combo',
  description = 'Daily 50 odds combo predictions designed to maximize profit'
WHERE slug = 'profit-multiplier';

-- Ensure fresh installs get the new name (for environments re-running seeds)
-- The main schema.sql seed already uses the new name/slug.
