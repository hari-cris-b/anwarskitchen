-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "menu_items_franchise_access" ON menu_items;
DROP POLICY IF EXISTS "Staff members can view their franchise staff" ON staff;
DROP POLICY IF EXISTS "Staff can access order items of their franchise" ON order_items;

-- Menu Items Policy
CREATE POLICY "menu_items_franchise_access"
ON menu_items
FOR ALL 
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

-- Staff Policy with explicit table reference
CREATE POLICY "Staff members can view their franchise staff"
ON staff
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM staff s
    WHERE s.auth_id = auth.uid()
    AND s.franchise_id = staff.franchise_id
  )
  OR 
  EXISTS (
    SELECT 1 
    FROM super_admin sa 
    WHERE sa.auth_id = auth.uid()
  )
);

-- Order Items Policy with proper joins
CREATE POLICY "Staff can access order items of their franchise"
ON order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM orders o
    JOIN staff s ON s.franchise_id = o.franchise_id
    WHERE order_items.order_id = o.id
    AND s.auth_id = auth.uid()
  )
);

-- Create function to validate orders access
CREATE OR REPLACE FUNCTION check_order_access(order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM orders o
    JOIN staff s ON s.franchise_id = o.franchise_id
    WHERE o.id = order_id
    AND s.auth_id = auth.uid()
  );
END;
$$;

-- Update RLS policy for orders to use proper table references
DROP POLICY IF EXISTS "Staff can view franchise orders" ON orders;
CREATE POLICY "Staff can view franchise orders"
ON orders
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM staff s
    WHERE s.auth_id = auth.uid()
    AND s.franchise_id = orders.franchise_id
  )
  OR 
  EXISTS (
    SELECT 1 
    FROM super_admin sa 
    WHERE sa.auth_id = auth.uid()
  )
);

-- Create indexes to improve join performance
CREATE INDEX IF NOT EXISTS idx_orders_franchise_id ON orders(franchise_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_franchise_id ON menu_items(franchise_id);
CREATE INDEX IF NOT EXISTS idx_staff_franchise_id ON staff(franchise_id);

-- Function to get orders with menu items
CREATE OR REPLACE FUNCTION get_orders_with_items(
  p_franchise_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  franchise_id UUID,
  table_number TEXT,
  status TEXT,
  customer_name TEXT,
  server_id UUID,
  server_name TEXT,
  notes TEXT,
  subtotal NUMERIC,
  tax NUMERIC,
  discount NUMERIC,
  additional_charges NUMERIC,
  total NUMERIC,
  payment_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  order_items JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH order_items_with_menu AS (
    SELECT 
      oi.order_id,
      jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'order_id', oi.order_id,
          'menu_item_id', oi.menu_item_id,
          'quantity', oi.quantity,
          'price_at_time', oi.price_at_time,
          'notes', oi.notes,
          'created_at', oi.created_at,
          'updated_at', oi.updated_at,
          'menu_items', to_jsonb(mi.*)
        )
      ) as items
    FROM order_items oi
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    GROUP BY oi.order_id
  )
  SELECT 
    o.id,
    o.franchise_id,
    o.table_number,
    o.status::TEXT,
    o.customer_name,
    o.server_id,
    o.server_name,
    o.notes,
    o.subtotal,
    o.tax,
    o.discount,
    o.additional_charges,
    o.total,
    o.payment_status,
    o.created_at,
    o.updated_at,
    oim.items::JSON as order_items
  FROM orders o
  LEFT JOIN order_items_with_menu oim ON oim.order_id = o.id
  WHERE o.franchise_id = p_franchise_id
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;