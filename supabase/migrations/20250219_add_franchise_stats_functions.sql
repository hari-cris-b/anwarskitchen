-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_franchise_staff_counts CASCADE;
DROP FUNCTION IF EXISTS get_franchise_revenue_totals CASCADE;
DROP FUNCTION IF EXISTS get_total_revenue_last_30_days CASCADE;

-- Create helper function to validate super admin access
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM super_admin
    WHERE auth_id = p_user_id
  );
END;
$$;

-- Create helper function to validate franchise existence
CREATE OR REPLACE FUNCTION franchise_exists(p_franchise_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM franchises
    WHERE id = p_franchise_id
  );
END;
$$;

-- Function to get staff counts per franchise
CREATE OR REPLACE FUNCTION get_franchise_staff_counts()
RETURNS TABLE (
  franchise_id uuid,
  staff_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify super admin access
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    f.id,
    COALESCE(COUNT(s.id), 0)::bigint
  FROM franchises f
  LEFT JOIN staff s ON f.id = s.franchise_id
  WHERE s.status = 'active' OR s.status IS NULL
  GROUP BY f.id;
END;
$$;

-- Function to get total revenue per franchise
CREATE OR REPLACE FUNCTION get_franchise_revenue_totals()
RETURNS TABLE (
  franchise_id uuid,
  total_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify super admin access
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    f.id,
    COALESCE(SUM(o.total), 0) as total_revenue
  FROM franchises f
  LEFT JOIN orders o ON f.id = o.franchise_id
  GROUP BY f.id;
END;
$$;

-- Function to get total revenue for last 30 days
CREATE OR REPLACE FUNCTION get_total_revenue_last_30_days()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  -- Verify super admin access
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  SELECT COALESCE(SUM(total), 0)
  INTO v_total
  FROM orders
  WHERE created_at >= NOW() - INTERVAL '30 days';

  RETURN v_total;
END;
$$;

-- Function to get combined franchise metrics
CREATE OR REPLACE FUNCTION get_franchise_metrics(p_franchise_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_staff_count bigint;
  v_revenue numeric;
  v_orders bigint;
BEGIN
  -- Verify super admin access
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Verify franchise exists
  IF NOT franchise_exists(p_franchise_id) THEN
    RAISE EXCEPTION 'Franchise not found';
  END IF;

  -- Get staff count
  SELECT COUNT(*)
  INTO v_staff_count
  FROM staff
  WHERE franchise_id = p_franchise_id
  AND status = 'active';

  -- Get orders and revenue
  SELECT 
    COUNT(*),
    COALESCE(SUM(total), 0)
  INTO v_orders, v_revenue
  FROM orders
  WHERE franchise_id = p_franchise_id;

  -- Construct result
  v_result := jsonb_build_object(
    'staff_count', v_staff_count,
    'total_orders', v_orders,
    'total_revenue', v_revenue
  );

  RETURN v_result;
END;
$$;

-- Set up RLS policies and grants
DO $$ 
BEGIN
  -- Revoke all existing permissions
  EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC');

  -- Grant execute permissions to authenticated users
  EXECUTE format('GRANT EXECUTE ON FUNCTION get_franchise_staff_counts TO authenticated');
  EXECUTE format('GRANT EXECUTE ON FUNCTION get_franchise_revenue_totals TO authenticated');
  EXECUTE format('GRANT EXECUTE ON FUNCTION get_total_revenue_last_30_days TO authenticated');
  EXECUTE format('GRANT EXECUTE ON FUNCTION get_franchise_metrics TO authenticated');
  EXECUTE format('GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated');
  EXECUTE format('GRANT EXECUTE ON FUNCTION franchise_exists TO authenticated');
END $$;