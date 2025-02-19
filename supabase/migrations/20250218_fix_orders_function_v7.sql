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
            oi.id AS order_item_id,
            oi.order_id,
            oi.menu_item_id AS item_menu_ref,
            oi.quantity,
            oi.price_at_time,
            oi.notes AS item_notes,
            oi.created_at AS item_created_at,
            mi.id AS menu_item_id,
            mi.franchise_id AS menu_item_franchise_id,
            mi.name AS menu_item_name,
            mi.description AS menu_item_description,
            mi.price AS menu_item_price,
            mi.category AS menu_item_category,
            mi.tax_rate AS menu_item_tax_rate,
            mi.image_url AS menu_item_image_url,
            mi.is_available AS menu_item_is_available,
            mi.is_active AS menu_item_is_active,
            mi.created_at AS menu_item_created_at,
            mi.updated_at AS menu_item_updated_at,
            ROW_NUMBER() OVER (PARTITION BY oi.order_id ORDER BY oi.created_at ASC) as rn
          FROM order_items oi
          JOIN menu_items mi ON mi.id = oi.menu_item_id
          WHERE oi.order_id = o.id
        )
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', order_item_id,
            'order_id', order_id,
            'menu_item_id', item_menu_ref,
            'quantity', quantity,
            'price_at_time', price_at_time,
            'notes', item_notes,
            'created_at', item_created_at,
            'menu_items', jsonb_build_object(
              'id', menu_item_id,
              'franchise_id', menu_item_franchise_id,
              'name', menu_item_name,
              'description', menu_item_description,
              'price', menu_item_price,
              'category', menu_item_category,
              'tax_rate', menu_item_tax_rate,
              'image_url', menu_item_image_url,
              'is_available', menu_item_is_available,
              'is_active', menu_item_is_active,
              'created_at', menu_item_created_at,
              'updated_at', menu_item_updated_at
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