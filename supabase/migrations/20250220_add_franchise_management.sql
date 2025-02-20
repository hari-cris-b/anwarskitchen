-- Begin transaction
BEGIN;

-- Function to get franchise staff counts
CREATE OR REPLACE FUNCTION get_franchise_staff_counts()
RETURNS TABLE (
  franchise_id uuid,
  count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has super admin role
  IF NOT is_super_admin_role() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    s.franchise_id,
    COUNT(*)::bigint
  FROM staff s
  WHERE s.status = 'active'
  GROUP BY s.franchise_id;

  -- Return empty result if nothing found
  IF NOT FOUND THEN
    RETURN;
  END IF;
END;
$$;

-- Function to get franchise revenue totals
CREATE OR REPLACE FUNCTION get_franchise_revenue_totals()
RETURNS TABLE (
  franchise_id uuid,
  total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has super admin role
  IF NOT is_super_admin_role() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    o.franchise_id,
    COALESCE(SUM(o.total), 0) as total
  FROM orders o
  WHERE o.status NOT IN ('cancelled'::order_status)
  GROUP BY o.franchise_id;

  -- Return empty result if nothing found
  IF NOT FOUND THEN
    RETURN;
  END IF;
END;
$$;

-- Function to get franchise menu performance
CREATE OR REPLACE FUNCTION get_franchise_menu_performance(p_franchise_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Check if user has super admin role
  IF NOT is_super_admin_role() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  WITH popular_items AS (
    SELECT 
      mi.name,
      COUNT(*) as order_count,
      SUM(oi.quantity * oi.price) as revenue
    FROM order_items oi
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    JOIN orders o ON oi.order_id = o.id
    WHERE 
      o.franchise_id = p_franchise_id
      AND o.status != 'cancelled'
    GROUP BY mi.id, mi.name
    ORDER BY order_count DESC
    LIMIT 5
  ),
  category_revenue AS (
    SELECT 
      c.name as category,
      COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
    FROM categories c
    LEFT JOIN menu_items mi ON mi.category_id = c.id
    LEFT JOIN order_items oi ON oi.menu_item_id = mi.id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE 
      o.franchise_id = p_franchise_id
      AND o.status != 'cancelled'
    GROUP BY c.id, c.name
  )
  SELECT json_build_object(
    'popular_items', (SELECT json_agg(row_to_json(popular_items)) FROM popular_items),
    'revenue_by_category', (SELECT json_object_agg(category, revenue) FROM category_revenue)
  ) INTO v_result;

  RETURN COALESCE(v_result, '{"popular_items":[], "revenue_by_category":{}}'::json);
END;
$$;

-- Function to get franchise staff activity
CREATE OR REPLACE FUNCTION get_franchise_staff_activity(p_franchise_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Check if user has super admin role
  IF NOT is_super_admin_role() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  SELECT json_build_object(
    'active', (
      SELECT COUNT(*) 
      FROM staff 
      WHERE franchise_id = p_franchise_id AND status = 'active'
    ),
    'total', (
      SELECT COUNT(*) 
      FROM staff 
      WHERE franchise_id = p_franchise_id
    )
  ) INTO v_result;

  RETURN COALESCE(v_result, '{"active":0, "total":0}'::json);
END;
$$;

-- Grant execute permissions
DO $$
BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION get_franchise_staff_counts() TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION get_franchise_revenue_totals() TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION get_franchise_menu_performance(uuid) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION get_franchise_staff_activity(uuid) TO authenticated';
END;
$$;

-- Add function comments
COMMENT ON FUNCTION get_franchise_staff_counts IS 'Get staff counts per franchise (super admin only)';
COMMENT ON FUNCTION get_franchise_revenue_totals IS 'Get revenue totals per franchise (super admin only)';
COMMENT ON FUNCTION get_franchise_menu_performance IS 'Get menu performance metrics for a franchise (super admin only)';
COMMENT ON FUNCTION get_franchise_staff_activity IS 'Get staff activity metrics for a franchise (super admin only)';

COMMIT;