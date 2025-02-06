-- Function to get an order by ID with all its details
CREATE OR REPLACE FUNCTION get_order_by_id(order_id_param UUID)
RETURNS TABLE (
  id UUID,
  franchise_id UUID,
  table_number TEXT,
  server_id UUID,
  server_name TEXT,
  status TEXT,
  payment_status TEXT,
  payment_method TEXT,
  subtotal DECIMAL,
  tax DECIMAL,
  total DECIMAL,
  discount DECIMAL,
  additional_charges DECIMAL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  pending_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.*,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', oi.id,
            'name', oi.name,
            'price', oi.price,
            'quantity', oi.quantity,
            'notes', oi.notes,
            'category', oi.category,
            'tax_rate', oi.tax_rate
          )
        )
        FROM order_items oi
        WHERE oi.order_id = o.id
      ),
      '[]'::jsonb
    ) as items
  FROM orders o
  WHERE o.id = order_id_param;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_order_by_id(UUID) TO authenticated;