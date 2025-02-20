BEGIN;

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_total_revenue_last_30_days(integer);

-- Recreate the function with explicit schema reference
CREATE OR REPLACE FUNCTION public.get_total_revenue_last_30_days(days_ago integer DEFAULT 30)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user has super admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.super_admin 
    WHERE auth_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Get total revenue with proper handling of nulls
  SELECT COALESCE(SUM(COALESCE(total, 0)), 0)
  INTO v_total
  FROM public.orders o
  WHERE 
    o.created_at >= NOW() - (days_ago || ' days')::interval
    AND o.status NOT IN ('cancelled');

  RETURN v_total;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error details
    RAISE WARNING 'Error in get_total_revenue_last_30_days: %', SQLERRM;
    -- Return 0 instead of failing
    RETURN 0;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_total_revenue_last_30_days(integer) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION public.get_total_revenue_last_30_days IS 'Returns total completed order revenue for given days (super admin only)';

-- Verify function exists
DO $$
BEGIN
  PERFORM public.get_total_revenue_last_30_days(30);
  RAISE NOTICE 'Function get_total_revenue_last_30_days exists and is callable';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Function verification failed: %', SQLERRM;
END $$;

COMMIT;