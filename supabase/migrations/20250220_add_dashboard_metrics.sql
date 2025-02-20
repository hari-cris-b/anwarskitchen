-- Begin transaction
BEGIN;

-- Step 1: Drop existing functions in reverse dependency order
DROP FUNCTION IF EXISTS get_top_performing_franchises(integer, integer);
DROP FUNCTION IF EXISTS get_total_revenue_last_30_days();
DROP FUNCTION IF EXISTS get_total_active_staff_count();

-- Step 2: Create helper function for super admin check
CREATE OR REPLACE FUNCTION is_super_admin_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM get_user_role(auth.uid())
    WHERE role_type = 'super_admin'
    AND is_super_admin = true
  );
END;
$$;

-- Step 3: Create function for staff count with proper null handling
CREATE OR REPLACE FUNCTION get_total_active_staff_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count bigint;
BEGIN
  -- Check if user has super admin role
  IF NOT is_super_admin_role() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM staff
  WHERE status = 'active';
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Step 4: Create function for revenue with proper handling
CREATE OR REPLACE FUNCTION get_total_revenue_last_30_days()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  -- Check if user has super admin role
  IF NOT is_super_admin_role() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  SELECT COALESCE(SUM(total), 0)
  INTO v_total
  FROM orders o
  WHERE o.created_at >= NOW() - INTERVAL '30 days'
    AND o.status NOT IN ('cancelled'::order_status);

  RETURN v_total;
END;
$$;

-- Step 5: Create function for top performers with proper typing
CREATE OR REPLACE FUNCTION get_top_performing_franchises(
  days_ago integer DEFAULT 30,
  limit_count integer DEFAULT 5
)
RETURNS TABLE (
  franchise_id uuid,
  franchise_name text,
  total_revenue numeric,
  order_count bigint,
  average_order_value numeric
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
  WITH filtered_orders AS (
    SELECT 
      o.franchise_id,
      COUNT(*) as order_count,
      SUM(o.total) as total_rev,
      AVG(o.total) as avg_order_value
    FROM orders o
    WHERE 
      o.created_at >= (CURRENT_TIMESTAMP - (days_ago || ' days')::interval)
      AND o.status NOT IN ('cancelled'::order_status)
    GROUP BY o.franchise_id
  )
  SELECT 
    f.id as franchise_id,
    f.name as franchise_name,
    COALESCE(fo.total_rev, 0) as total_revenue,
    COALESCE(fo.order_count, 0) as order_count,
    COALESCE(fo.avg_order_value, 0) as average_order_value
  FROM franchises f
  LEFT JOIN filtered_orders fo ON f.id = fo.franchise_id
  WHERE f.settings->>'subscription_status' = 'active'
  ORDER BY fo.total_rev DESC NULLS LAST
  LIMIT LEAST(limit_count, 100);

  -- Return empty row if no results
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::uuid,
      NULL::text,
      0::numeric,
      0::bigint,
      0::numeric
    WHERE false;
  END IF;
END;
$$;

-- Step 6: Grant execute permissions
DO $$
BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION is_super_admin_role() TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION get_total_active_staff_count() TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION get_total_revenue_last_30_days() TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION get_top_performing_franchises(integer, integer) TO authenticated';
END;
$$;

-- Step 7: Add function comments
COMMENT ON FUNCTION is_super_admin_role IS 'Check if current user has super admin role';
COMMENT ON FUNCTION get_total_active_staff_count IS 'Returns count of active staff members (super admin only)';
COMMENT ON FUNCTION get_total_revenue_last_30_days IS 'Returns total completed order revenue (super admin only)';
COMMENT ON FUNCTION get_top_performing_franchises IS 'Returns top performing franchises by revenue (super admin only)';

-- Step 8: Create test helper function
CREATE OR REPLACE FUNCTION test_dashboard_metrics()
RETURNS TABLE (
  metric_name text,
  metric_value text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_revenue numeric;
  v_staff bigint;
  v_performers record;
BEGIN
  -- Test role check
  metric_name := 'Role Check';
  metric_value := CASE WHEN is_super_admin_role() 
                      THEN 'Super Admin' 
                      ELSE 'Not Super Admin' 
                  END;
  RETURN NEXT;

  -- Test staff count
  BEGIN
    v_staff := get_total_active_staff_count();
    metric_name := 'Staff Count';
    metric_value := v_staff::text;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    metric_name := 'Staff Count Error';
    metric_value := SQLERRM;
    RETURN NEXT;
  END;
  
  -- Test revenue
  BEGIN
    v_revenue := get_total_revenue_last_30_days();
    metric_name := 'Revenue';
    metric_value := v_revenue::text;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    metric_name := 'Revenue Error';
    metric_value := SQLERRM;
    RETURN NEXT;
  END;
  
  -- Test top performers
  BEGIN
    FOR v_performers IN 
      SELECT * FROM get_top_performing_franchises(30, 5)
    LOOP
      metric_name := 'Top Performer';
      metric_value := format('%s - Revenue: %s, Avg Order: %s',
        v_performers.franchise_name,
        v_performers.total_revenue,
        v_performers.average_order_value
      );
      RETURN NEXT;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    metric_name := 'Top Performers Error';
    metric_value := SQLERRM;
    RETURN NEXT;
  END;
END;
$$;

-- Step 9: Run tests
SELECT * FROM test_dashboard_metrics();

COMMIT;
