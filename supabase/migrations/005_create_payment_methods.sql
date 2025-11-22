-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('bank_transfer', 'crypto')),
  currency VARCHAR(10), -- For crypto: BTC, ETH. For bank: null (uses plan currency)
  details JSONB NOT NULL, -- Stores account details, wallet addresses, etc.
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON payment_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_display_order ON payment_methods(display_order);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view active payment methods
DROP POLICY IF EXISTS "Active payment methods are viewable by everyone" ON payment_methods;
CREATE POLICY "Active payment methods are viewable by everyone" ON payment_methods
  FOR SELECT USING (is_active = true);

-- Admins can view all payment methods
DROP POLICY IF EXISTS "Admins can view all payment methods" ON payment_methods;
CREATE POLICY "Admins can view all payment methods" ON payment_methods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Admins can insert payment methods
DROP POLICY IF EXISTS "Admins can insert payment methods" ON payment_methods;
CREATE POLICY "Admins can insert payment methods" ON payment_methods
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Admins can update payment methods
DROP POLICY IF EXISTS "Admins can update payment methods" ON payment_methods;
CREATE POLICY "Admins can update payment methods" ON payment_methods
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Admins can delete payment methods
DROP POLICY IF EXISTS "Admins can delete payment methods" ON payment_methods;
CREATE POLICY "Admins can delete payment methods" ON payment_methods
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Insert default payment methods
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

