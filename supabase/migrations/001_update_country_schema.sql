-- Migration: Update database schema for country-only user registration
-- This migration ensures the database is properly configured for REST Countries API integration

-- 1. Ensure countries table has the correct structure for API integration
-- Update code column to handle both 2-character (CCA2) and 3-character (CCA3) codes
ALTER TABLE countries 
  ALTER COLUMN code TYPE VARCHAR(10); -- Allow longer codes if needed

-- Add index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);

-- Add index on name for faster searches
CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name);

-- 2. Ensure users table only has country_id (no city field)
-- Verify users table structure is correct
DO $$
BEGIN
  -- Check if city_id column exists and remove it if it does
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'city_id'
  ) THEN
    ALTER TABLE users DROP COLUMN city_id;
  END IF;

  -- Check if city column exists and remove it if it does
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'city'
  ) THEN
    ALTER TABLE users DROP COLUMN city;
  END IF;
END $$;

-- 3. Add index on country_id in users table for better performance
CREATE INDEX IF NOT EXISTS idx_users_country_id ON users(country_id);

-- 4. Update countries table to support REST Countries API data
-- Add a column to store the full country name from API (if different from name)
ALTER TABLE countries 
  ADD COLUMN IF NOT EXISTS api_name VARCHAR(255);

-- Add a column to store CCA3 code (3-letter code) if needed
ALTER TABLE countries 
  ADD COLUMN IF NOT EXISTS cca3_code VARCHAR(3);

-- 5. Create a function to automatically create country if it doesn't exist
-- This will be used by the application when a user signs up with a country code
CREATE OR REPLACE FUNCTION get_or_create_country(
  country_code VARCHAR(10),
  country_name VARCHAR(255) DEFAULT NULL,
  currency_code VARCHAR(10) DEFAULT 'USD',
  currency_symbol VARCHAR(5) DEFAULT '$'
) RETURNS UUID AS $$
DECLARE
  country_uuid UUID;
BEGIN
  -- Try to find existing country by code
  SELECT id INTO country_uuid
  FROM countries
  WHERE code = country_code
  LIMIT 1;

  -- If country doesn't exist, create it
  IF country_uuid IS NULL THEN
    INSERT INTO countries (code, name, currency, currency_symbol, is_active)
    VALUES (country_code, COALESCE(country_name, country_code), currency_code, currency_symbol, true)
    RETURNING id INTO country_uuid;
  END IF;

  RETURN country_uuid;
END;
$$ LANGUAGE plpgsql;

-- 6. Add comment to document the schema
COMMENT ON TABLE countries IS 'Stores country information from REST Countries API. Code field stores CCA2 (2-letter) codes.';
COMMENT ON COLUMN countries.code IS 'Country code (CCA2 format from REST Countries API, e.g., US, NG, GB)';
COMMENT ON COLUMN countries.name IS 'Common country name';
COMMENT ON COLUMN users.country_id IS 'Reference to user''s country. Only country is stored, not city.';

-- 7. Ensure country_id in users table is nullable (optional field)
ALTER TABLE users 
  ALTER COLUMN country_id DROP NOT NULL;

-- 8. Add constraint to ensure code is uppercase (standard for country codes)
ALTER TABLE countries 
  ADD CONSTRAINT check_code_uppercase 
  CHECK (code = UPPER(code));

-- Migration complete
-- The database is now configured to:
-- 1. Store only country information (no city)
-- 2. Support REST Countries API integration with CCA2 codes
-- 3. Automatically create countries when users sign up
-- 4. Have proper indexes for performance

