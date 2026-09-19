-- =============================================================================
-- 029: Stop assuming every user is Nigerian.
-- =============================================================================
--
-- PredictSafe serves a global audience, but `users.country` defaulted to
-- 'Nigeria' and the signup trigger coalesced anything missing to 'Nigeria'.
-- On top of that the app only ever wrote one of four values - Nigeria, Ghana,
-- Kenya or the catch-all 'Other' - so a user in Rwanda was stored as 'Other'
-- and then rendered as Nigeria at checkout.
--
-- After this migration `country` holds the user's actual country name, and
-- "we don't know yet" is represented honestly as NULL rather than as Nigeria.

-- A user whose country we don't know should not be silently labelled Nigerian.
ALTER TABLE users ALTER COLUMN country DROP DEFAULT;
ALTER TABLE users ALTER COLUMN country DROP NOT NULL;

-- `plan_prices.country` keeps its NOT NULL constraint: a price row genuinely
-- does belong to a country (or to the 'Other' / USD catch-all). Only the
-- default is dropped, so new price rows must name their country explicitly
-- instead of quietly becoming Nigerian.
ALTER TABLE plan_prices ALTER COLUMN country DROP DEFAULT;

-- Store the country the user actually chose at signup. No Nigeria fallback:
-- if the metadata carries no country, the column stays NULL and the UI asks.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, country, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'country', '')), ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    -- Never overwrite a country the user has already set with a blank one.
    country = COALESCE(EXCLUDED.country, public.users.country),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, country, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'country', '')), ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    country = COALESCE(EXCLUDED.country, public.users.country),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Existing rows are deliberately left alone. 'Other' is not silently reassigned
-- to a real country - we genuinely don't know which country those users are in,
-- and guessing is what caused this problem. The checkout now asks them instead.
