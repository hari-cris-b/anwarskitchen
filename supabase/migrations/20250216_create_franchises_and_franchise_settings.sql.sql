-- Begin transaction
BEGIN;

-- Create franchises table if it doesn't exist
CREATE TABLE IF NOT EXISTS franchises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  address text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'))
);

-- Create franchise_settings table
CREATE TABLE franchise_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id uuid NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  business_name text,
  tax_rate numeric,
  currency text,
  business_hours jsonb,
  theme jsonb,
  phone text,
  email text,
  address text,
  gst_number text,
  subscription_status text NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_franchise_settings_franchise_id ON franchise_settings(franchise_id);
CREATE UNIQUE INDEX idx_franchise_settings_unique_franchise ON franchise_settings(franchise_id);

-- Add RLS policies
ALTER TABLE franchise_settings ENABLE ROW LEVEL SECURITY;

-- Staff can read their franchise settings
CREATE POLICY "Staff can view own franchise settings" ON franchise_settings
  FOR SELECT
  USING (franchise_id = auth.jwt() ->> 'franchise_id'::text);

-- Only franchise admins can update their franchise settings
CREATE POLICY "Admins can update own franchise settings" ON franchise_settings
  FOR UPDATE
  USING (franchise_id = auth.jwt() ->> 'franchise_id'::text)
  WITH CHECK (franchise_id = auth.jwt() ->> 'franchise_id'::text);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON franchise_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE franchise_settings IS 'Stores settings and configuration for each franchise';

COMMIT;