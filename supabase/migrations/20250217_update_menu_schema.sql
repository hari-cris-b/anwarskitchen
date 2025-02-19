-- Add new columns to menu_items
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records
UPDATE menu_items 
SET 
  tax_rate = 0.00,
  is_active = true
WHERE tax_rate IS NULL 
   OR is_active IS NULL;

-- Make sure all required fields have proper constraints
ALTER TABLE menu_items
ALTER COLUMN tax_rate SET NOT NULL,
ALTER COLUMN is_active SET NOT NULL,
ALTER COLUMN is_available SET DEFAULT true,
ALTER COLUMN is_available SET NOT NULL,
ALTER COLUMN price SET NOT NULL;

-- Drop sequence if it exists
DROP SEQUENCE IF EXISTS menu_categories_display_order_seq;

-- Create sequence for display_order
CREATE SEQUENCE menu_categories_display_order_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Add check constraints
ALTER TABLE menu_items
ADD CONSTRAINT menu_items_tax_rate_check 
  CHECK (tax_rate >= 0 AND tax_rate <= 100),
ADD CONSTRAINT menu_items_price_check 
  CHECK (price >= 0);

-- Update menu categories
ALTER TABLE menu_categories
ALTER COLUMN display_order SET DEFAULT 0,
ALTER COLUMN display_order SET NOT NULL;

-- Add indices for better performance
CREATE INDEX IF NOT EXISTS idx_menu_items_category 
ON menu_items(category_id, is_active, is_available);

CREATE INDEX IF NOT EXISTS idx_menu_items_franchise 
ON menu_items(franchise_id, is_active);

CREATE INDEX IF NOT EXISTS idx_menu_categories_order 
ON menu_categories(franchise_id, display_order);

-- Update existing triggers to handle new fields
CREATE OR REPLACE FUNCTION initialize_franchise_menu(p_franchise_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert default categories if none exist
  IF NOT EXISTS (
    SELECT 1 FROM menu_categories 
    WHERE franchise_id = p_franchise_id
  ) THEN
    INSERT INTO menu_categories (
      franchise_id,
      name,
      description,
      display_order
    )
    VALUES
      (p_franchise_id, 'Main Dishes', 'Primary menu items', 1),
      (p_franchise_id, 'Sides', 'Side dishes and accompaniments', 2),
      (p_franchise_id, 'Beverages', 'Drinks and refreshments', 3),
      (p_franchise_id, 'Desserts', 'Sweet treats and desserts', 4);
  END IF;

  -- Insert sample menu items if none exist
  IF NOT EXISTS (
    SELECT 1 FROM menu_items 
    WHERE franchise_id = p_franchise_id
  ) THEN
    INSERT INTO menu_items (
      franchise_id,
      category_id,
      name,
      description,
      price,
      is_available,
      tax_rate,
      is_active
    )
    SELECT 
      p_franchise_id,
      c.id,
      'Sample ' || c.name || ' Item',
      'A sample menu item in the ' || c.name || ' category',
      9.99,
      true,
      5.00, -- 5% tax rate
      true
    FROM menu_categories c
    WHERE c.franchise_id = p_franchise_id;
  END IF;
END;
$$;