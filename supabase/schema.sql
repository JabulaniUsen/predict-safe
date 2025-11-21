-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Countries table
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(10) NOT NULL UNIQUE, -- Supports CCA2 (2-letter) codes from REST Countries API
  currency VARCHAR(10) NOT NULL,
  currency_symbol VARCHAR(5) NOT NULL,
  payment_gateway VARCHAR(50),
  api_name VARCHAR(255), -- Full country name from API
  cca3_code VARCHAR(3), -- 3-letter country code (optional)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_code_uppercase CHECK (code = UPPER(code))
);

-- Indexes for countries table
CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name);

-- Users table (extends auth.users)
-- Note: Only country is stored, not city
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  country_id UUID REFERENCES countries(id), -- Only country reference, no city
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT false
);

-- Index for users table
CREATE INDEX IF NOT EXISTS idx_users_country_id ON users(country_id);

-- Plans table
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

-- Plan prices table (country-specific pricing)
CREATE TABLE IF NOT EXISTS plan_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 30)),
  price DECIMAL(10, 2) NOT NULL,
  activation_fee DECIMAL(10, 2),
  currency VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, country_id, duration_days)
);

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  plan_status VARCHAR(20) DEFAULT 'inactive' CHECK (plan_status IN ('inactive', 'pending_activation', 'active', 'expired')),
  subscription_fee_paid BOOLEAN DEFAULT false,
  activation_fee_paid BOOLEAN DEFAULT false,
  start_date TIMESTAMP WITH TIME ZONE,
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plan_id)
);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('profit_multiplier', 'daily_2_odds', 'standard', 'free')),
  home_team VARCHAR(255) NOT NULL,
  away_team VARCHAR(255) NOT NULL,
  league VARCHAR(255) NOT NULL,
  prediction_type VARCHAR(100) NOT NULL,
  odds DECIMAL(5, 2) NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  kickoff_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'live', 'finished')),
  result VARCHAR(10) CHECK (result IN ('win', 'loss', 'pending')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Correct score predictions table
CREATE TABLE IF NOT EXISTS correct_score_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_team VARCHAR(255) NOT NULL,
  away_team VARCHAR(255) NOT NULL,
  league VARCHAR(255) NOT NULL,
  score_prediction VARCHAR(10) NOT NULL,
  odds DECIMAL(5, 2),
  kickoff_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'live', 'finished')),
  result VARCHAR(10) CHECK (result IN ('win', 'loss', 'pending')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VIP winnings table
CREATE TABLE IF NOT EXISTS vip_winnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_name VARCHAR(100) NOT NULL,
  home_team VARCHAR(255) NOT NULL,
  away_team VARCHAR(255) NOT NULL,
  prediction_type VARCHAR(100) NOT NULL,
  result VARCHAR(10) NOT NULL CHECK (result IN ('win', 'loss')),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blog posts table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site configuration table
CREATE TABLE IF NOT EXISTS site_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
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

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(plan_status);
CREATE INDEX IF NOT EXISTS idx_predictions_plan_type ON predictions(plan_type);
CREATE INDEX IF NOT EXISTS idx_predictions_kickoff_time ON predictions(kickoff_time);
CREATE INDEX IF NOT EXISTS idx_correct_score_kickoff_time ON correct_score_predictions(kickoff_time);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_prices_updated_at BEFORE UPDATE ON plan_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_correct_score_predictions_updated_at BEFORE UPDATE ON correct_score_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_config_updated_at BEFORE UPDATE ON site_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE correct_score_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_winnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Countries policies (public read)
CREATE POLICY "Countries are viewable by everyone" ON countries
  FOR SELECT USING (is_active = true);

-- Plans policies (public read)
CREATE POLICY "Active plans are viewable by everyone" ON plans
  FOR SELECT USING (is_active = true);

-- Plan prices policies (public read)
CREATE POLICY "Plan prices are viewable by everyone" ON plan_prices
  FOR SELECT USING (true);

-- User subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Predictions policies
CREATE POLICY "Free predictions are viewable by everyone" ON predictions
  FOR SELECT USING (plan_type = 'free');

CREATE POLICY "Users can view predictions for their active plans" ON predictions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_subscriptions.user_id = auth.uid()
        AND user_subscriptions.plan_status = 'active'
        AND (
          (plan_type = 'profit_multiplier' AND user_subscriptions.plan_id IN (SELECT id FROM plans WHERE slug = 'profit-multiplier'))
          OR (plan_type = 'daily_2_odds' AND user_subscriptions.plan_id IN (SELECT id FROM plans WHERE slug = 'daily-2-odds'))
          OR (plan_type = 'standard' AND user_subscriptions.plan_id IN (SELECT id FROM plans WHERE slug = 'standard'))
        )
    )
  );

-- Correct score predictions policies
CREATE POLICY "Users can view correct score if they have active subscription" ON correct_score_predictions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_subscriptions.user_id = auth.uid()
        AND user_subscriptions.plan_status = 'active'
        AND user_subscriptions.plan_id IN (SELECT id FROM plans WHERE slug = 'correct-score')
    )
  );

-- VIP winnings policies (public read)
CREATE POLICY "VIP winnings are viewable by everyone" ON vip_winnings
  FOR SELECT USING (true);

-- Blog posts policies (public read published posts)
CREATE POLICY "Published blog posts are viewable by everyone" ON blog_posts
  FOR SELECT USING (published = true AND published_at IS NOT NULL AND published_at <= NOW());

-- Site config policies (public read)
CREATE POLICY "Site config is viewable by everyone" ON site_config
  FOR SELECT USING (true);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Insert initial data (using CCA2 country codes from REST Countries API)
INSERT INTO countries (name, code, currency, currency_symbol, payment_gateway) VALUES
  ('Nigeria', 'NG', 'NGN', '₦', 'flutterwave'),
  ('Ghana', 'GH', 'GHS', '₵', 'flutterwave'),
  ('Kenya', 'KE', 'KES', 'KSh', 'flutterwave'),
  ('United States', 'US', 'USD', '$', 'stripe')
ON CONFLICT (code) DO NOTHING;

-- Insert default plans
INSERT INTO plans (name, slug, description, requires_activation, max_predictions_per_day) VALUES
  ('Profit Multiplier', 'profit-multiplier', 'High-value predictions designed to maximize profit', false, 5),
  ('Daily 2 Odds', 'daily-2-odds', 'Safe, consistent 2+ odds predictions', false, 10),
  ('Standard Package', 'standard', 'Affordable plan for casual bettors', false, 15),
  ('Correct Score', 'correct-score', 'Accurate scoreline predictions', true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Insert default site config
INSERT INTO site_config (key, value) VALUES
  ('hero_headline', '"Welcome to PredictSafe"'),
  ('hero_subtext', '"Your trusted source for accurate football predictions"'),
  ('telegram_link', '"https://t.me/predictsafe"'),
  ('contact_email', '"support@predictsafe.com"'),
  ('whatsapp_numbers', '[]'),
  ('social_links', '{"facebook": "", "twitter": "", "instagram": "", "youtube": ""}')
ON CONFLICT (key) DO NOTHING;

-- Function to get or create country (for REST Countries API integration)
-- This function is used when users sign up with a country code from the API
CREATE OR REPLACE FUNCTION get_or_create_country(
  country_code VARCHAR(10),
  country_name VARCHAR(255) DEFAULT NULL,
  currency_code VARCHAR(10) DEFAULT 'USD',
  currency_symbol VARCHAR(5) DEFAULT '$'
) RETURNS UUID AS $$
DECLARE
  country_uuid UUID;
BEGIN
  -- Try to find existing country by code (uppercase)
  SELECT id INTO country_uuid
  FROM countries
  WHERE code = UPPER(country_code)
  LIMIT 1;

  -- If country doesn't exist, create it
  IF country_uuid IS NULL THEN
    INSERT INTO countries (code, name, currency, currency_symbol, is_active)
    VALUES (UPPER(country_code), COALESCE(country_name, country_code), currency_code, currency_symbol, true)
    RETURNING id INTO country_uuid;
  END IF;

  RETURN country_uuid;
END;
$$ LANGUAGE plpgsql;

