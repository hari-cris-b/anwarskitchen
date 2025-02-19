-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_orders_with_items;

-- Create improved function to get orders with items
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
  order_items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH order_items_with_menu AS (
    SELECT 
      oi.order_id,
      jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'order_id', oi.order_id,
        'menu_item_id', oi.menu_item_id,
        'quantity', oi.quantity,
        'price_at_time', oi.price_at_time,
        'notes', oi.notes,
        'created_at', oi.created_at,
        'menu_items', jsonb_build_object(
          'id', mi.id,
          'name', mi.name,
          'price', mi.price,
          'category', mi.category,
          'is_available', mi.is_available,
          'franchise_id', mi.franchise_id
        )
      ) ORDER BY oi.created_at) as items
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
    COALESCE(oim.items, '[]'::jsonb) as order_items
  FROM orders o
  LEFT JOIN order_items_with_menu oim ON oim.order_id = o.id
  WHERE o.franchise_id = p_franchise_id
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
  ON order_items(order_id);

-- Update RLS policy for orders
DROP POLICY IF EXISTS "Staff can view franchise orders" ON orders;
CREATE POLICY "Staff can view franchise orders"
ON orders
FOR ALL
USING (
  (auth.uid() IN (
    SELECT s.auth_id 
    FROM staff s 
    WHERE s.franchise_id = orders.franchise_id
  ))
  OR 
  EXISTS (
    SELECT 1 
    FROM super_admin sa 
    WHERE sa.auth_id = auth.uid()
  )
);