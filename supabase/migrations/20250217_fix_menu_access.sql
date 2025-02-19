-- Add RLS policies for menu access
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Allow franchise staff to read their menu items
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

-- Allow admins and managers to modify menu
CREATE POLICY "Admins and managers can modify menu"
  ON menu_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM staff s 
      WHERE s.auth_id = auth.uid() 
      AND s.franchise_id = menu_items.franchise_id
      AND s.staff_type IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 
      FROM super_admin sa 
      WHERE sa.auth_id = auth.uid()
    )
  );

-- Add RLS for menu categories
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

-- Allow franchise staff to view categories
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

-- Allow admins and managers to modify categories
CREATE POLICY "Admins and managers can modify categories"
  ON menu_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM staff s 
      WHERE s.auth_id = auth.uid() 
      AND s.franchise_id = menu_categories.franchise_id
      AND s.staff_type IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 
      FROM super_admin sa 
      WHERE sa.auth_id = auth.uid()
    )
  );

-- Function to initialize default menu for franchise
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
      is_available
    )
    SELECT 
      p_franchise_id,
      c.id,
      'Sample ' || c.name || ' Item',
      'A sample menu item in the ' || c.name || ' category',
      9.99,
      true
    FROM menu_categories c
    WHERE c.franchise_id = p_franchise_id;
  END IF;
END;
$$;

-- Grant access to read menu data
GRANT SELECT ON menu_items TO authenticated;
GRANT SELECT ON menu_categories TO authenticated;

-- Grant access to initialize menu
GRANT EXECUTE ON FUNCTION initialize_franchise_menu TO authenticated;

-- Add function to check and initialize menu
CREATE OR REPLACE FUNCTION ensure_menu_initialized(p_franchise_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if menu exists
  IF NOT EXISTS (
    SELECT 1 
    FROM menu_items 
    WHERE franchise_id = p_franchise_id
  ) THEN
    -- Initialize menu
    PERFORM initialize_franchise_menu(p_franchise_id);
    RETURN true;
  END IF;
  RETURN false;
END;
$$;