-- =============================================================================
-- PredictSafe MASTER MIGRATION
-- =============================================================================
-- Run this file ONCE in the Supabase SQL Editor and everything is set:
-- tables, columns, indexes, triggers, functions, RLS policies, storage
-- buckets + storage policies, and all seed data.
--
-- It is safe to re-run: every statement is idempotent (IF NOT EXISTS /
-- DROP IF EXISTS / ON CONFLICT DO NOTHING), so running it on a database
-- that already has some of this applied changes nothing.
--
-- What this consolidates (in dependency order):
--   schema.sql (base tables, triggers, RLS, plans + site_config seeds)
--   005 payment_methods table + seeds        007 user_subscriptions policies
--   008 blog admin policies + indexes        009 vip_winnings plan_id + policies
--   010 vip_winnings league                  011 signup triggers (functions at
--                                            their final 029 versions)
--   012 payment logo_url/country             013 logo bucket
--   014 payment-logos bucket + policies      015 countries[] migration + policy
--   016 payment-logos bucket (repeat-safe)   017 vip prediction_type nullable
--                                            (folded into base definition)
--   018 blog scheduling/meta/tags            019 ad_links
--   020 custom_pages + seeds                 021 blog view_count + function
--   022 competitions + bucket + seeds        023 blog competition_id
--   024 predictions league_id                025 competitions import columns
--   026 payment_link                         027 plan rename (safe no-op fresh)
--   028 prediction_date + ticket fields + generated_free_picks
--   029 global-country fix (functions + alters)
--   030 link_partnerships
--   add_correct_score plan_type value        storage-setup (payment-proofs)
--   storage-blog-images-setup                avatars bucket (AVATARS_SETUP.md)
--
-- Deliberately NOT included (superseded, would fail on a fresh database):
--   001 (references the long-dropped `countries` table - dropped by 004)
--   002 (plan_status check already contains 'pending' in the base definition)
--   003 (admin plans/plan_prices policies already in the base definition)
--   004 (references `countries`; base tables are already at its end state)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Base tables
-- -----------------------------------------------------------------------------

-- Users (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  -- The user's actual country. NULL means "not stated yet" - deliberately not
  -- defaulted to any one country (migration 029).
  country VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT false
);

-- Plans
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  benefits TEXT[],
  requires_activation BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  max_predictions_per_day INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plan prices (country-specific pricing; country is never defaulted)
CREATE TABLE IF NOT EXISTS plan_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  country VARCHAR(100) NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 30)),
  price DECIMAL(10, 2) NOT NULL,
  activation_fee DECIMAL(10, 2),
  currency VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, country, duration_days)
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  plan_status VARCHAR(20) DEFAULT 'inactive' CHECK (plan_status IN ('inactive', 'pending', 'pending_activation', 'active', 'expired')),
  subscription_fee_paid BOOLEAN DEFAULT false,
  activation_fee_paid BOOLEAN DEFAULT false,
  start_date TIMESTAMP WITH TIME ZONE,
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plan_id)
);

-- Predictions. prediction_date is written once at creation and never
-- re-derived, so every section of the site agrees on which predictions
-- belong to a given date regardless of the viewer's timezone.
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('profit_multiplier', 'daily_2_odds', 'standard', 'free', 'correct_score')),
  home_team VARCHAR(255) NOT NULL,
  away_team VARCHAR(255) NOT NULL,
  league VARCHAR(255) NOT NULL,
  prediction_type VARCHAR(100),
  odds DECIMAL(5, 2) NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  kickoff_time TIMESTAMP WITH TIME ZONE NOT NULL,
  prediction_date DATE NOT NULL,
  match_id VARCHAR(50),
  league_id VARCHAR(50),
  home_team_id VARCHAR(50),
  away_team_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'live', 'finished')),
  result VARCHAR(10) CHECK (result IN ('win', 'loss', 'pending')),
  home_score INTEGER,
  away_score INTEGER,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Correct score predictions (legacy table, kept aligned)
CREATE TABLE IF NOT EXISTS correct_score_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_team VARCHAR(255) NOT NULL,
  away_team VARCHAR(255) NOT NULL,
  league VARCHAR(255) NOT NULL,
  score_prediction VARCHAR(10) NOT NULL,
  odds DECIMAL(5, 2),
  kickoff_time TIMESTAMP WITH TIME ZONE NOT NULL,
  prediction_date DATE,
  match_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'live', 'finished')),
  result VARCHAR(10) CHECK (result IN ('win', 'loss', 'pending')),
  home_score INTEGER,
  away_score INTEGER,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VIP winnings (rendered as betting tickets)
CREATE TABLE IF NOT EXISTS vip_winnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_name VARCHAR(100) NOT NULL,
  home_team VARCHAR(255) NOT NULL,
  away_team VARCHAR(255) NOT NULL,
  prediction_type VARCHAR(100),
  odds DECIMAL(6, 2),
  home_score INTEGER,
  away_score INTEGER,
  league VARCHAR(255),
  league_id VARCHAR(50),
  match_id VARCHAR(50),
  kickoff_time TIMESTAMP WITH TIME ZONE,
  prediction_id UUID REFERENCES predictions(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  result VARCHAR(10) NOT NULL CHECK (result IN ('win', 'loss')),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated free picks: built once per (date, filter) server-side so every
-- visitor is served the identical set.
CREATE TABLE IF NOT EXISTS generated_free_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_date DATE NOT NULL,
  filter_id VARCHAR(50) NOT NULL,
  picks JSONB NOT NULL,
  leagues_total INTEGER NOT NULL DEFAULT 0,
  leagues_succeeded INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(prediction_date, filter_id)
);

-- Blog posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image TEXT,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  meta_keywords TEXT,
  tags TEXT[],
  view_count BIGINT NOT NULL DEFAULT 0,
  competition_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site configuration
CREATE TABLE IF NOT EXISTS site_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  payment_gateway VARCHAR(50) NOT NULL,
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('subscription', 'activation')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  gateway_transaction_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages (user-admin chat)
-- NOTE: To enable real-time updates, go to Supabase Dashboard > Database >
-- Replication and enable replication for the 'messages' table.
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment methods (admin-managed; rendered on /checkout with instructions)
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('bank_transfer', 'crypto', 'mobile_money', 'skrill', 'paypal', 'other')),
  currency VARCHAR(10),
  details JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  logo_url TEXT,
  countries JSONB DEFAULT '[]'::jsonb,
  payment_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competitions (SEO hubs per league/tournament)
CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  league_id VARCHAR(50) NOT NULL,
  featured_image TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  seo_title VARCHAR(255),
  seo_description TEXT,
  heading VARCHAR(255),
  subheading TEXT,
  introduction TEXT,
  display_order INTEGER DEFAULT 0,
  country VARCHAR(255),
  competition_type VARCHAR(50),
  current_season VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom pages (tips landing pages, some shown in the footer)
CREATE TABLE IF NOT EXISTS custom_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  heading VARCHAR(255),
  subheading TEXT,
  description TEXT,
  filter_id VARCHAR(50),
  is_published BOOLEAN DEFAULT true,
  show_in_footer BOOLEAN DEFAULT false,
  footer_section VARCHAR(50) DEFAULT 'predictions',
  footer_label VARCHAR(100),
  footer_order INTEGER DEFAULT 0,
  meta_title VARCHAR(255),
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Affiliate / Partners Links (admin screen; Type = partners/menu_link,
-- Location = link_1/link_2). Menu-link rows are the navbar Link 1 / Link 2
-- slots and render as server-side dofollow backlinks for reciprocal-link SEO.
CREATE TABLE IF NOT EXISTS ad_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'menu_link',
  location TEXT NOT NULL DEFAULT 'link_1',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bring databases created before migration 033 up to the same shape.
ALTER TABLE ad_links ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'menu_link';
ALTER TABLE ad_links ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT 'link_1';
UPDATE ad_links SET type = 'menu_link' WHERE type NOT IN ('partners', 'menu_link');
UPDATE ad_links SET location = 'link_1' WHERE location NOT IN ('link_1', 'link_2');
ALTER TABLE ad_links DROP CONSTRAINT IF EXISTS ad_links_type_check;
ALTER TABLE ad_links ADD CONSTRAINT ad_links_type_check
  CHECK (type IN ('partners', 'menu_link'));
ALTER TABLE ad_links DROP CONSTRAINT IF EXISTS ad_links_location_check;
ALTER TABLE ad_links ADD CONSTRAINT ad_links_location_check
  CHECK (location IN ('link_1', 'link_2'));
CREATE INDEX IF NOT EXISTS idx_ad_links_type_location_active
  ON ad_links(type, location, is_active);

-- Link partnerships (reciprocal-link configuration; a row is NOT a backlink)
CREATE TABLE IF NOT EXISTS link_partnerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_name TEXT NOT NULL,
  partner_domain TEXT NOT NULL,
  partner_website TEXT NOT NULL,
  target_url TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'recommended_platforms',
  link_attribute TEXT NOT NULL DEFAULT 'standard'
    CHECK (link_attribute IN ('standard', 'nofollow', 'sponsored', 'ugc')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'inactive')),
  display_order INTEGER NOT NULL DEFAULT 0,
  their_backlink_url TEXT,
  our_target_url TEXT,
  their_anchor_text TEXT,
  their_link_status TEXT NOT NULL DEFAULT 'expected'
    CHECK (their_link_status IN ('expected', 'confirmed', 'removed')),
  notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- blog_posts.competition_id FK (kept separate so table order never matters)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'blog_posts_competition_id_fkey'
  ) THEN
    ALTER TABLE blog_posts
      ADD CONSTRAINT blog_posts_competition_id_fkey
      FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Delta columns from later migrations (all IF NOT EXISTS - safe no-ops
--    where the base definition above already includes them)
-- -----------------------------------------------------------------------------
-- 023: blog competition link
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_competition_id ON blog_posts(competition_id);

-- 024: provider league id on predictions
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS league_id VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_predictions_league_id ON predictions(league_id);

-- 025: competition import metadata
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS country VARCHAR(255);
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS competition_type VARCHAR(50);
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS current_season VARCHAR(20);

-- 026: optional payment link on payment methods
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS payment_link TEXT;

-- 018: blog scheduling / meta / tags
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS meta_keywords TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[];
CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled_at ON blog_posts(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- 021: blog view counter
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS view_count BIGINT NOT NULL DEFAULT 0;

-- add_correct_score: allow correct-score rows in predictions.plan_type
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_plan_type_check;
ALTER TABLE predictions ADD CONSTRAINT predictions_plan_type_check
  CHECK (plan_type IN ('profit_multiplier', 'daily_2_odds', 'standard', 'free', 'correct_score'));

-- 012: payment method logos (the `country` column it added was later
-- migrated to `countries` and dropped by 015 - see section 8)
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS country VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_payment_methods_country ON payment_methods(country);

-- -----------------------------------------------------------------------------
-- 3. Functions (final versions)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 029 (final): store the country the user actually chose; NULL when unknown.
-- Never fall back to any default country.
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

-- 021: view counter callable by anon users without broad UPDATE rights
CREATE OR REPLACE FUNCTION public.increment_blog_post_views(post_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count BIGINT;
BEGIN
  UPDATE blog_posts
  SET view_count = view_count + 1
  WHERE id = post_id
    AND published = true
    AND published_at IS NOT NULL
    AND published_at <= NOW()
  RETURNING view_count INTO updated_count;

  RETURN COALESCE(updated_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_blog_post_views(UUID) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Triggers
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_plan_prices_updated_at ON plan_prices;
CREATE TRIGGER update_plan_prices_updated_at BEFORE UPDATE ON plan_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_predictions_updated_at ON predictions;
CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_correct_score_predictions_updated_at ON correct_score_predictions;
CREATE TRIGGER update_correct_score_predictions_updated_at BEFORE UPDATE ON correct_score_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_config_updated_at ON site_config;
CREATE TRIGGER update_site_config_updated_at BEFORE UPDATE ON site_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_custom_pages_updated_at ON custom_pages;
CREATE TRIGGER update_custom_pages_updated_at BEFORE UPDATE ON custom_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_competitions_updated_at ON competitions;
CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON competitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_generated_free_picks_updated_at ON generated_free_picks;
CREATE TRIGGER update_generated_free_picks_updated_at
  BEFORE UPDATE ON generated_free_picks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 011: auto-create the public user row on signup / email confirmation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.handle_user_email_confirmed();

-- -----------------------------------------------------------------------------
-- 5. Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(plan_status);
CREATE INDEX IF NOT EXISTS idx_predictions_plan_type ON predictions(plan_type);
CREATE INDEX IF NOT EXISTS idx_predictions_kickoff_time ON predictions(kickoff_time);
CREATE INDEX IF NOT EXISTS idx_predictions_prediction_date ON predictions(prediction_date);
CREATE INDEX IF NOT EXISTS idx_predictions_date_plan ON predictions(prediction_date, plan_type);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_correct_score_kickoff_time ON correct_score_predictions(kickoff_time);
CREATE INDEX IF NOT EXISTS idx_correct_score_prediction_date ON correct_score_predictions(prediction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON payment_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_display_order ON payment_methods(display_order);
CREATE INDEX IF NOT EXISTS idx_payment_methods_countries ON payment_methods USING GIN (countries);
CREATE INDEX IF NOT EXISTS idx_plan_prices_country ON plan_prices(country);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published, published_at);
CREATE INDEX IF NOT EXISTS idx_vip_winnings_plan_id ON vip_winnings(plan_id);
CREATE INDEX IF NOT EXISTS idx_vip_winnings_date ON vip_winnings(date);
CREATE INDEX IF NOT EXISTS idx_vip_winnings_league ON vip_winnings(league);
CREATE INDEX IF NOT EXISTS idx_vip_winnings_prediction_id ON vip_winnings(prediction_id);
CREATE INDEX IF NOT EXISTS idx_generated_free_picks_lookup ON generated_free_picks(prediction_date, filter_id);
CREATE INDEX IF NOT EXISTS idx_link_partnerships_status ON link_partnerships(status);
CREATE INDEX IF NOT EXISTS idx_link_partnerships_placement ON link_partnerships(placement);
CREATE INDEX IF NOT EXISTS idx_link_partnerships_status_placement ON link_partnerships(status, placement);
CREATE INDEX IF NOT EXISTS idx_link_partnerships_partner_domain ON link_partnerships(partner_domain);

-- -----------------------------------------------------------------------------
-- 6. Row Level Security + policies
-- -----------------------------------------------------------------------------
-- NOTE: site_config, predictions, transactions and correct_score_predictions
-- intentionally have NO policies / no RLS here - that matches production, the
-- app reads them with the anon key. Do not "harden" this without updating
-- the app's data layer first.
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_winnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_free_picks ENABLE ROW LEVEL SECURITY;

-- Plans
DROP POLICY IF EXISTS "Active plans are viewable by everyone" ON plans;
CREATE POLICY "Active plans are viewable by everyone" ON plans
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can view all plans" ON plans;
CREATE POLICY "Admins can view all plans" ON plans
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can insert plans" ON plans;
CREATE POLICY "Admins can insert plans" ON plans
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can update plans" ON plans;
CREATE POLICY "Admins can update plans" ON plans
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can delete plans" ON plans;
CREATE POLICY "Admins can delete plans" ON plans
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));

-- Plan prices
DROP POLICY IF EXISTS "Plan prices are viewable by everyone" ON plan_prices;
CREATE POLICY "Plan prices are viewable by everyone" ON plan_prices
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert plan prices" ON plan_prices;
CREATE POLICY "Admins can insert plan prices" ON plan_prices
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can update plan prices" ON plan_prices;
CREATE POLICY "Admins can update plan prices" ON plan_prices
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can delete plan prices" ON plan_prices;
CREATE POLICY "Admins can delete plan prices" ON plan_prices
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));

-- User subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can insert their own subscriptions" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON user_subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON user_subscriptions
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON user_subscriptions;
CREATE POLICY "Admins can update all subscriptions" ON user_subscriptions
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can insert subscriptions" ON user_subscriptions;
CREATE POLICY "Admins can insert subscriptions" ON user_subscriptions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));

-- VIP winnings (public read + admin write)
DROP POLICY IF EXISTS "VIP winnings are viewable by everyone" ON vip_winnings;
CREATE POLICY "VIP winnings are viewable by everyone" ON vip_winnings
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert VIP winnings" ON vip_winnings;
CREATE POLICY "Admins can insert VIP winnings" ON vip_winnings
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can update VIP winnings" ON vip_winnings;
CREATE POLICY "Admins can update VIP winnings" ON vip_winnings
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can delete VIP winnings" ON vip_winnings;
CREATE POLICY "Admins can delete VIP winnings" ON vip_winnings
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));

-- Blog posts (public read of published + admin full access)
DROP POLICY IF EXISTS "Published blog posts are viewable by everyone" ON blog_posts;
CREATE POLICY "Published blog posts are viewable by everyone" ON blog_posts
  FOR SELECT USING (published = true AND published_at IS NOT NULL AND published_at <= NOW());
DROP POLICY IF EXISTS "Admins can view all blog posts" ON blog_posts;
CREATE POLICY "Admins can view all blog posts" ON blog_posts
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can insert blog posts" ON blog_posts;
CREATE POLICY "Admins can insert blog posts" ON blog_posts
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can update blog posts" ON blog_posts;
CREATE POLICY "Admins can update blog posts" ON blog_posts
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can delete blog posts" ON blog_posts;
CREATE POLICY "Admins can delete blog posts" ON blog_posts
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));

-- Notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Messages
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
CREATE POLICY "Users can insert their own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() = sender_id);
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE POLICY "Admins can view all messages" ON messages
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can insert messages" ON messages;
CREATE POLICY "Admins can insert messages" ON messages
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can update all messages" ON messages;
CREATE POLICY "Admins can update all messages" ON messages
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));

-- Payment methods (public read of active + admin full access).
-- NOTE (031): country filtering is done in the app (see lib/payment-methods.ts),
-- NOT in RLS. Filtering here by joining public.users made newly added methods
-- invisible to logged-out users, users with NULL country, and other cases
-- where the join misfires.
DROP POLICY IF EXISTS "Active payment methods are viewable by everyone" ON payment_methods;
CREATE POLICY "Active payment methods are viewable by everyone" ON payment_methods
  FOR SELECT USING (is_active = true);
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

-- Custom pages
DROP POLICY IF EXISTS "Published pages viewable by everyone" ON custom_pages;
CREATE POLICY "Published pages viewable by everyone" ON custom_pages
  FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "Admins can select all custom_pages" ON custom_pages;
CREATE POLICY "Admins can select all custom_pages" ON custom_pages
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can insert custom_pages" ON custom_pages;
CREATE POLICY "Admins can insert custom_pages" ON custom_pages
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can update custom_pages" ON custom_pages;
CREATE POLICY "Admins can update custom_pages" ON custom_pages
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can delete custom_pages" ON custom_pages;
CREATE POLICY "Admins can delete custom_pages" ON custom_pages
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));

-- Competitions
DROP POLICY IF EXISTS "Active competitions viewable by everyone" ON competitions;
CREATE POLICY "Active competitions viewable by everyone" ON competitions
  FOR SELECT USING (status = 'active');
DROP POLICY IF EXISTS "Admins can select all competitions" ON competitions;
CREATE POLICY "Admins can select all competitions" ON competitions
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can insert competitions" ON competitions;
CREATE POLICY "Admins can insert competitions" ON competitions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can update competitions" ON competitions;
CREATE POLICY "Admins can update competitions" ON competitions
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can delete competitions" ON competitions;
CREATE POLICY "Admins can delete competitions" ON competitions
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));

-- Ad links
DROP POLICY IF EXISTS "Active ad links are viewable by everyone" ON ad_links;
CREATE POLICY "Active ad links are viewable by everyone" ON ad_links
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can view all ad links" ON ad_links;
CREATE POLICY "Admins can view all ad links" ON ad_links
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can insert ad links" ON ad_links;
CREATE POLICY "Admins can insert ad links" ON ad_links
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can update ad links" ON ad_links;
CREATE POLICY "Admins can update ad links" ON ad_links
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can delete ad links" ON ad_links;
CREATE POLICY "Admins can delete ad links" ON ad_links
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));

-- Link partnerships (public reads ACTIVE rows only; admins everything)
DROP POLICY IF EXISTS "Active partnerships are viewable by everyone" ON link_partnerships;
CREATE POLICY "Active partnerships are viewable by everyone" ON link_partnerships
  FOR SELECT USING (status = 'active');
DROP POLICY IF EXISTS "Admins can view all link partnerships" ON link_partnerships;
CREATE POLICY "Admins can view all link partnerships" ON link_partnerships
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can insert link partnerships" ON link_partnerships;
CREATE POLICY "Admins can insert link partnerships" ON link_partnerships
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can update link partnerships" ON link_partnerships;
CREATE POLICY "Admins can update link partnerships" ON link_partnerships
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));
DROP POLICY IF EXISTS "Admins can delete link partnerships" ON link_partnerships;
CREATE POLICY "Admins can delete link partnerships" ON link_partnerships
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));

-- Generated free picks (public read; writes go through the service role only)
DROP POLICY IF EXISTS "Free picks are viewable by everyone" ON generated_free_picks;
CREATE POLICY "Free picks are viewable by everyone" ON generated_free_picks
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage free picks" ON generated_free_picks;
CREATE POLICY "Admins can manage free picks" ON generated_free_picks
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));

-- -----------------------------------------------------------------------------
-- 7. Storage buckets + policies
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES
  ('payment-proofs', 'payment-proofs', false),
  ('blog-images', 'blog-images', true),
  ('competition-images', 'competition-images', true),
  ('payment-logos', 'payment-logos', true),
  ('avatars', 'avatars', true),
  ('logo', 'logo', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- STORAGE POLICIES: create these in the Dashboard, NOT here.
-- The SQL editor role is not the owner of storage.objects, so any
-- CREATE POLICY on it fails with "42501: must be owner of table objects".
-- Go to Storage -> click each bucket -> Policies -> New policy -> "Create a
-- policy from scratch" (or "Use template" where noted) with these settings:
--
-- payment-proofs (private):
--   1. INSERT, authenticated, WITH CHECK:
--      bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]
--   2. SELECT, authenticated, USING:
--      bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]
--   3. SELECT, authenticated, USING:
--      bucket_id = 'payment-proofs' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
--   4. DELETE, authenticated, USING:
--      bucket_id = 'payment-proofs' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
-- blog-images (public):
--   1. INSERT, authenticated, WITH CHECK:
--      bucket_id = 'blog-images' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
--   2. SELECT, public ("Enable read access to everyone" template), USING:
--      bucket_id = 'blog-images'
--   3. UPDATE, authenticated, USING + WITH CHECK:
--      bucket_id = 'blog-images' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
--   4. DELETE, authenticated, USING:
--      bucket_id = 'blog-images' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
-- competition-images (public):
--   1. INSERT, authenticated, WITH CHECK: bucket_id = 'competition-images'
--   2. UPDATE, authenticated, USING + WITH CHECK: bucket_id = 'competition-images'
--   3. DELETE, authenticated, USING: bucket_id = 'competition-images'
--   4. SELECT, public ("Enable read access to everyone" template), USING: bucket_id = 'competition-images'
-- payment-logos (public):
--   1. INSERT, authenticated, WITH CHECK: bucket_id = 'payment-logos'
--   2. UPDATE, authenticated, USING + WITH CHECK: bucket_id = 'payment-logos'
--   3. DELETE, authenticated, USING: bucket_id = 'payment-logos'
--   4. SELECT, public ("Enable read access to everyone" template), USING: bucket_id = 'payment-logos'
-- avatars (public):
--   1. SELECT, public ("Enable read access to everyone" template), USING: bucket_id = 'avatars'
-- (Afterwards, upload avatar images into the avatars bucket - signup picks a
-- random one for each new user.)

-- -----------------------------------------------------------------------------
-- 8. Seed data (all ON CONFLICT DO NOTHING - safe on existing databases)
-- -----------------------------------------------------------------------------
INSERT INTO plans (name, slug, description, requires_activation, max_predictions_per_day) VALUES
  ('Daily 50 Odds Combo', 'daily-50-odds-combo', 'Daily 50 odds combo predictions designed to maximize profit', false, 5),
  ('Daily 2 Odds', 'daily-2-odds', 'Safe, consistent 2+ odds predictions', false, 10),
  ('Standard Package', 'standard', 'Affordable plan for casual bettors', false, 15),
  ('Correct Score', 'correct-score', 'Accurate scoreline predictions', true, 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO site_config (key, value) VALUES
  ('site_header', '"PredictSafe"'),
  ('site_subheader', '"Your trusted source for accurate football predictions and betting tips."'),
  ('hero_headline', '"Welcome to PredictSafe"'),
  ('hero_subtext', '"Your trusted source for accurate football predictions"'),
  ('telegram_link', '"https://t.me/predictsafe"'),
  ('contact_email', '"support@predictsafe.com"'),
  ('whatsapp_number', '""'),
  ('whatsapp_numbers', '[]'),
  ('chat_support_url', '""'),
  ('social_links', '{"facebook": "", "twitter": "", "instagram": "", "youtube": ""}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO payment_methods (name, type, currency, details, display_order) VALUES
  ('Bank Transfer', 'bank_transfer', NULL,
   '{"account_name": "", "account_number": "", "bank_name": "", "swift_code": "", "instructions": "Please include your email in the transaction reference."}',
   1),
  ('Bitcoin (BTC)', 'crypto', 'BTC',
   '{"wallet_address": "", "network": "Bitcoin", "instructions": "Send exact amount to the wallet address. Include your email in the memo."}',
   2),
  ('Ethereum (ETH)', 'crypto', 'ETH',
   '{"wallet_address": "", "network": "Ethereum", "instructions": "Send exact amount to the wallet address. Include your email in the memo."}',
   3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO custom_pages (slug, title, heading, subheading, description, filter_id, is_published, show_in_footer, footer_section, footer_label, footer_order)
VALUES
  ('safe-free-picks', 'Safe Free Picks', 'Safe Free Picks', 'Low-risk daily football tips', 'Carefully selected low-odds tips with high confidence. Ideal for consistent returns.', 'free', true, true, 'predictions', 'Safe Free Picks', 1),
  ('all-tips', 'All Tips', 'All Tips', 'Full daily coverage across all markets', 'Browse every available prediction across all markets and leagues for today.', 'all', true, true, 'predictions', 'All Tips', 2),
  ('super-single', 'Super Single Tips', 'Super Single', 'The highest-value single tip of the day', 'One standout pick with the best value odds drawn from today''s fixtures.', 'super_single', true, true, 'predictions', 'Super Single', 3),
  ('double-chance', 'Double Chance Tips', 'Double Chance', 'Cover two outcomes with one bet', 'Predictions using the Double Chance market — higher safety, wider coverage.', 'double_chance', true, true, 'predictions', 'Double Chance', 4),
  ('home-win', 'Home Win Tips', 'Home Win Tips', 'Back the home side with confidence', 'Fixtures where the home team is strongly favoured to take all three points.', 'home_win', true, true, 'predictions', 'Home Win', 5),
  ('away-win', 'Away Win Tips', 'Away Win Tips', 'Profit from strong away sides', 'Fixtures where away form and head-to-head data favour the travelling team.', 'away_win', true, true, 'predictions', 'Away Win', 6),
  ('1-5-goals', 'Over 1.5 Goals Tips', 'Over 1.5 Goals', 'At least two goals expected', 'Matches where the data strongly suggests a minimum of two goals will be scored.', 'over_1_5', true, true, 'predictions', '1.5 Goals', 7),
  ('2-5-goals', 'Over 2.5 Goals Tips', 'Over 2.5 Goals', 'High-scoring matches predicted', 'Fixtures where attacking quality and head-to-head trends point to three or more goals.', 'over_2_5', true, true, 'predictions', '2.5 Goals', 8),
  ('btts-gg', 'BTTS / GG Tips', 'Both Teams To Score', 'Goals at both ends', 'Predictions where both teams are expected to find the net — ideal for GG accumulators.', 'btts', true, true, 'predictions', 'BTTS/GG', 9)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO competitions (slug, name, league_id, status, seo_title, seo_description, heading, subheading, introduction, display_order)
VALUES
  ('world-cup', 'World Cup', '1', 'active',
   'FIFA World Cup Predictions, Fixtures, Results & Standings',
   'Latest FIFA World Cup predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'FIFA World Cup', 'Predictions, fixtures, results, standings and match insights.', NULL, 1),
  ('premier-league', 'Premier League', '39', 'active',
   'Premier League Predictions, Fixtures, Results & Standings',
   'Latest Premier League predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'Premier League', 'Predictions, fixtures, results, standings and match insights.', NULL, 2),
  ('champions-league', 'Champions League', '2', 'active',
   'UEFA Champions League Predictions, Fixtures, Results & Standings',
   'Latest UEFA Champions League predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'UEFA Champions League', 'Predictions, fixtures, results, standings and match insights.', NULL, 3),
  ('europa-league', 'Europa League', '3', 'active',
   'UEFA Europa League Predictions, Fixtures, Results & Standings',
   'Latest UEFA Europa League predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'UEFA Europa League', 'Predictions, fixtures, results, standings and match insights.', NULL, 4),
  ('afcon', 'AFCON', '6', 'active',
   'AFCON Predictions, Fixtures, Results & Standings',
   'Latest Africa Cup of Nations predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'Africa Cup of Nations', 'Predictions, fixtures, results, standings and match insights.', NULL, 5),
  ('euro-cup', 'Euro Cup', '4', 'active',
   'UEFA Euro Predictions, Fixtures, Results & Standings',
   'Latest UEFA European Championship predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'UEFA Euro Championship', 'Predictions, fixtures, results, standings and match insights.', NULL, 6),
  ('club-world-cup', 'Club World Cup', '15', 'active',
   'FIFA Club World Cup Predictions, Fixtures, Results & Standings',
   'Latest FIFA Club World Cup predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'FIFA Club World Cup', 'Predictions, fixtures, results, standings and match insights.', NULL, 7),
  ('la-liga', 'La Liga', '140', 'active',
   'La Liga Predictions, Fixtures, Results & Standings',
   'Latest La Liga predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'La Liga', 'Predictions, fixtures, results, standings and match insights.', NULL, 8),
  ('bundesliga', 'Bundesliga', '78', 'active',
   'Bundesliga Predictions, Fixtures, Results & Standings',
   'Latest Bundesliga predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'Bundesliga', 'Predictions, fixtures, results, standings and match insights.', NULL, 9),
  ('serie-a', 'Serie A', '135', 'active',
   'Serie A Predictions, Fixtures, Results & Standings',
   'Latest Serie A predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'Serie A', 'Predictions, fixtures, results, standings and match insights.', NULL, 10)
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. Legacy-data guards (no-ops on a fresh database; repair old ones)
-- -----------------------------------------------------------------------------
-- 029: a country must never be silently defaulted.
ALTER TABLE users ALTER COLUMN country DROP DEFAULT;
ALTER TABLE users ALTER COLUMN country DROP NOT NULL;
ALTER TABLE plan_prices ALTER COLUMN country DROP DEFAULT;

-- 027: rename the old Profit Multiplier plan if it still exists.
UPDATE plans
SET
  name = 'Daily 50 Odds Combo',
  slug = 'daily-50-odds-combo',
  description = 'Daily 50 odds combo predictions designed to maximize profit'
WHERE slug = 'profit-multiplier';

-- 015: fold any leftover single `country` value into `countries[]` (only runs
-- where the old column still exists), then drop it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'country'
  ) THEN
    UPDATE payment_methods
    SET countries = CASE
      WHEN country IS NOT NULL THEN jsonb_build_array(country)
      ELSE '[]'::jsonb
    END
    WHERE countries = '[]'::jsonb OR countries IS NULL;
    ALTER TABLE payment_methods DROP COLUMN country;
  END IF;
END $$;

-- 028: backfill prediction dates from kickoff times where missing.
UPDATE predictions
SET prediction_date = (kickoff_time AT TIME ZONE 'UTC')::date
WHERE prediction_date IS NULL;

UPDATE correct_score_predictions
SET prediction_date = (kickoff_time AT TIME ZONE 'UTC')::date
WHERE prediction_date IS NULL;

-- 028: normalise historical VIP plan names after the 027 rename.
UPDATE vip_winnings
SET plan_name = 'Daily 50 Odds Combo'
WHERE plan_name IN ('Profit Multiplier', 'profit multiplier', 'Profit multiplier');

-- -----------------------------------------------------------------------------
-- 10. Verify: lists every expected table and its row count.
-- -----------------------------------------------------------------------------
SELECT table_name AS setup_table,
       (SELECT count(*) FROM information_schema.tables t
         WHERE t.table_schema = 'public' AND t.table_name = v.table_name) AS exists_flag
FROM (VALUES
  ('users'), ('plans'), ('plan_prices'), ('user_subscriptions'),
  ('predictions'), ('correct_score_predictions'), ('vip_winnings'),
  ('generated_free_picks'), ('blog_posts'), ('site_config'),
  ('transactions'), ('notifications'), ('messages'), ('payment_methods'),
  ('competitions'), ('custom_pages'), ('ad_links'), ('link_partnerships')
) AS v(table_name)
ORDER BY table_name;

-- END OF MASTER MIGRATION
