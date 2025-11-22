-- Migration: Remove countries table and use country names as strings
-- This migration converts country_id UUID references to country VARCHAR strings

-- Step 1: Add new country column to plan_prices (temporary)
ALTER TABLE plan_prices ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Step 2: Migrate data from country_id to country (if countries table has data)
-- Note: This will only work if there's existing data in countries table
-- For new deployments, this will be empty
UPDATE plan_prices pp
SET country = c.name
FROM countries c
WHERE pp.country_id = c.id AND c.name IN ('Nigeria', 'Ghana', 'Kenya');

-- Step 3: Set default country for rows with no country (or null country_id)
UPDATE plan_prices 
SET country = 'Nigeria' 
WHERE country IS NULL OR country = '';

-- Step 4: Drop the old unique constraint on (plan_id, country_id, duration_days)
ALTER TABLE plan_prices DROP CONSTRAINT IF EXISTS plan_prices_plan_id_country_id_duration_days_key;

-- Step 5: Drop the foreign key constraint on country_id
ALTER TABLE plan_prices DROP CONSTRAINT IF EXISTS plan_prices_country_id_fkey;

-- Step 6: Remove country_id column
ALTER TABLE plan_prices DROP COLUMN IF EXISTS country_id;

-- Step 7: Make country column NOT NULL
ALTER TABLE plan_prices ALTER COLUMN country SET NOT NULL;

-- Step 8: Add new unique constraint on (plan_id, country, duration_days)
ALTER TABLE plan_prices ADD CONSTRAINT plan_prices_plan_id_country_duration_days_key 
  UNIQUE(plan_id, country, duration_days);

-- Step 9: Add country column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Nigeria';

-- Step 10: Migrate user country data (if exists)
UPDATE users u
SET country = c.name
FROM countries c
WHERE u.country_id = c.id AND c.name IN ('Nigeria', 'Ghana', 'Kenya');

-- Step 11: Set default country for users without country
UPDATE users 
SET country = 'Nigeria' 
WHERE country IS NULL OR country = '';

-- Step 12: Make country column NOT NULL in users
ALTER TABLE users ALTER COLUMN country SET NOT NULL;

-- Step 13: Drop foreign key constraint on users.country_id
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_country_id_fkey;

-- Step 14: Drop country_id column from users
ALTER TABLE users DROP COLUMN IF EXISTS country_id;

-- Step 15: Drop index on country_id
DROP INDEX IF EXISTS idx_users_country_id;

-- Step 16: Drop countries table (after all references are removed)
DROP TABLE IF EXISTS countries CASCADE;

-- Step 17: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plan_prices_country ON plan_prices(country);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);

