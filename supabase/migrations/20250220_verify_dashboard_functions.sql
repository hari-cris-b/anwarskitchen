BEGIN;

-- Function to check if required functions exist
CREATE OR REPLACE FUNCTION verify_required_functions() 
RETURNS TABLE (
  function_name text,
  exists boolean,
  has_permission boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_functions text[] := ARRAY[
    'get_total_revenue_last_30_days',
    'get_total_active_staff_count',
    'get_top_performing_franchises',
    'get_franchise_staff_counts',
    'get_franchise_revenue_totals'
  ];
  v_function text;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check each function
  FOREACH v_function IN ARRAY v_functions
  LOOP
    function_name := v_function;
    exists := EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = v_function
    );
    
    -- Check if user has execute permission
    BEGIN
      EXECUTE format('SELECT %I()', v_function);
      has_permission := true;
    EXCEPTION WHEN OTHERS THEN
      has_permission := false;
    END;
    
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Run verification
SELECT * FROM verify_required_functions();

-- Add any missing functions
DO $$
BEGIN
  -- get_franchise_staff_counts
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_franchise_staff_counts') THEN
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
    END;
    $$;
    
    GRANT EXECUTE ON FUNCTION get_franchise_staff_counts() TO authenticated;
  END IF;

  -- get_franchise_revenue_totals
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_franchise_revenue_totals') THEN
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
      IF NOT is_super_admin_role() THEN
        RAISE EXCEPTION 'Access denied: Super admin privileges required';
      END IF;
    
      RETURN QUERY
      SELECT 
        o.franchise_id,
        COALESCE(SUM(o.total), 0) as total
      FROM orders o
      WHERE o.status != 'cancelled'
      GROUP BY o.franchise_id;
    END;
    $$;
    
    GRANT EXECUTE ON FUNCTION get_franchise_revenue_totals() TO authenticated;
  END IF;
END$$;

-- Re-verify functions after adding missing ones
SELECT * FROM verify_required_functions();

-- Drop verification function
DROP FUNCTION verify_required_functions();

COMMIT;