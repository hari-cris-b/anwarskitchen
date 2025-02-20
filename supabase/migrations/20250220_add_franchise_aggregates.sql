-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_franchise_staff_counts();
DROP FUNCTION IF EXISTS get_franchise_revenue_totals();

-- Function to get staff counts per franchise
CREATE FUNCTION get_franchise_staff_counts()
RETURNS TABLE (
  franchise_id uuid,
  count bigint
) 
SECURITY DEFINER
LANGUAGE sql
AS $$
  SELECT franchise_id, COUNT(*) as count
  FROM staff
  WHERE is_active = true
  GROUP BY franchise_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_franchise_staff_counts TO authenticated;

-- Function to get revenue totals per franchise
CREATE FUNCTION get_franchise_revenue_totals()
RETURNS TABLE (
  franchise_id uuid,
  total numeric
)
SECURITY DEFINER 
LANGUAGE sql
AS $$
  SELECT 
    franchise_id,
    COALESCE(SUM(total), 0) as total
  FROM orders
  WHERE status = 'completed'
  GROUP BY franchise_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_franchise_revenue_totals TO authenticated;

-- Create policies to ensure super admin access
ALTER FUNCTION get_franchise_staff_counts() SET search_path = public;
ALTER FUNCTION get_franchise_revenue_totals() SET search_path = public;

DO $$
BEGIN
  PERFORM verify_user_is_super_admin();
END;
$$;