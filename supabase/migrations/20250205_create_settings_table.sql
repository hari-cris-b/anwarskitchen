-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL,
  address TEXT,
  phone TEXT NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  print_format TEXT NOT NULL DEFAULT 'thermal',
  auto_backup BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(franchise_id)
);

-- Add RLS policies
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their franchise settings"
  ON settings
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE franchise_id = settings.franchise_id
    )
  );

CREATE POLICY "Users can update their franchise settings"
  ON settings
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE franchise_id = settings.franchise_id
    )
  );

CREATE POLICY "Users can insert their franchise settings"
  ON settings
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE franchise_id = settings.franchise_id
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();