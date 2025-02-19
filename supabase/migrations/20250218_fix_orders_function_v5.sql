-- Drop existing function
DROP FUNCTION IF EXISTS get_orders_with_items;

-- Create improved function with complete menu item fields
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
    COALESCE(
      (
        WITH ordered_items AS (
          SELECT 
            oi.id,
            oi.order_id,
            oi.menu_item_id,
            oi.quantity,
            oi.price_at_time,
            oi.notes,
            oi.created_at,
            mi.id as mi_id,
            mi.franchise_id as mi_franchise_id,
            mi.name,
            mi.description,
            mi.price,
            mi.category,
            mi.tax_rate,
            mi.image_url,
            mi.is_available,
            mi.is_active,
            mi.created_at as mi_created_at,
            mi.updated_at as mi_updated_at,
            ROW_NUMBER() OVER (PARTITION BY oi.order_id ORDER BY oi.created_at ASC) as rn
          FROM order_items oi
          JOIN menu_items mi ON mi.id = oi.menu_item_id
          WHERE oi.order_id = o.id
        )
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', id,
            'order_id', order_id,
            'menu_item_id', menu_item_id,
            'quantity', quantity,
            'price_at_time', price_at_time,
            'notes', notes,
            'created_at', created_at,
            'menu_items', jsonb_build_object(
              'id', mi_id,
              'franchise_id', mi_franchise_id,
              'name', name,
              'description', description,
              'price', price,
              'category', category,
              'tax_rate', tax_rate,
              'image_url', image_url,
              'is_available', is_available,
              'is_active', is_active,
              'created_at', mi_created_at,
              'updated_at', mi_updated_at
            )
          ) ORDER BY rn
        )
        FROM ordered_items
      ),
      '[]'::jsonb
    ) as order_items
  FROM orders o
  WHERE o.franchise_id = p_franchise_id
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Update indices if needed
DROP INDEX IF EXISTS idx_order_items_order_id_menu_item;
DROP INDEX IF EXISTS idx_menu_items_franchise;
DROP INDEX IF EXISTS idx_menu_items_category;

CREATE INDEX IF NOT EXISTS idx_order_items_order_id_menu_item ON order_items(order_id, menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_franchise ON menu_items(franchise_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);