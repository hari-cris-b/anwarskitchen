-- Create menu_categories table
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Add basic indices
CREATE INDEX idx_menu_categories_franchise ON menu_categories(franchise_id);
CREATE INDEX idx_menu_items_franchise ON menu_items(franchise_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_availability ON menu_items(is_available, is_active);

-- Create trigger function for updating timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_menu_categories_timestamp
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_menu_items_timestamp
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add RLS policies for menu_categories
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view their franchise menu categories"
  ON menu_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM staff s 
      WHERE s.auth_id = auth.uid() 
      AND s.franchise_id = menu_categories.franchise_id
    )
    OR
    EXISTS (
      SELECT 1 
      FROM super_admin sa 
      WHERE sa.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can modify menu categories"
  ON menu_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM staff s 
      WHERE s.auth_id = auth.uid() 
      AND s.franchise_id = menu_categories.franchise_id
      AND s.staff_type = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 
      FROM super_admin sa 
      WHERE sa.auth_id = auth.uid()
    )
  );

-- Add RLS policies for menu_items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view their franchise menu items"
  ON menu_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM staff s 
      WHERE s.auth_id = auth.uid() 
      AND s.franchise_id = menu_items.franchise_id
    )
    OR
    EXISTS (
      SELECT 1 
      FROM super_admin sa 
      WHERE sa.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can modify menu items"
  ON menu_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM staff s 
      WHERE s.auth_id = auth.uid() 
      AND s.franchise_id = menu_items.franchise_id
      AND s.staff_type = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 
      FROM super_admin sa 
      WHERE sa.auth_id = auth.uid()
    )
  );

-- Grant access to authenticated users
GRANT SELECT ON menu_categories TO authenticated;
GRANT SELECT ON menu_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON menu_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON menu_items TO authenticated;
GRANT USAGE ON SEQUENCE menu_categories_display_order_seq TO authenticated;