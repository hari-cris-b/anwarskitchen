-- Function to check data health
CREATE OR REPLACE FUNCTION check_dashboard_data_health()
RETURNS TABLE (
  check_name text,
  check_result text,
  record_count bigint,
  sample_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check super admin access
  RETURN QUERY
  SELECT 
    'Super Admin Check'::text,
    CASE WHEN EXISTS (
      SELECT 1 FROM super_admin 
      WHERE auth_id = auth.uid()
    ) THEN 'Access Granted' ELSE 'Access Denied' END,
    COUNT(*)::bigint,
    NULL::jsonb
  FROM super_admin;

  -- Check orders
  RETURN QUERY
  SELECT 
    'Orders Data'::text,
    CASE 
      WHEN COUNT(*) > 0 THEN 'Has Data'
      ELSE 'No Data'
    END,
    COUNT(*)::bigint,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        jsonb_build_object(
          'total_orders', COUNT(*),
          'with_total', COUNT(*) FILTER (WHERE total IS NOT NULL),
          'statuses', jsonb_agg(DISTINCT status),
          'date_range', jsonb_build_object(
            'earliest', MIN(created_at),
            'latest', MAX(created_at)
          )
        )
      ELSE NULL
    END
  FROM orders;

  -- Check franchises
  RETURN QUERY
  SELECT 
    'Franchises Data'::text,
    CASE 
      WHEN COUNT(*) > 0 THEN 'Has Data'
      ELSE 'No Data'
    END,
    COUNT(*)::bigint,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        jsonb_build_object(
          'active_count', COUNT(*) FILTER (WHERE settings->>'subscription_status' = 'active'),
          'inactive_count', COUNT(*) FILTER (WHERE settings->>'subscription_status' != 'active')
        )
      ELSE NULL
    END
  FROM franchises;

  -- Check staff
  RETURN QUERY
  SELECT 
    'Staff Data'::text,
    CASE 
      WHEN COUNT(*) > 0 THEN 'Has Data'
      ELSE 'No Data'
    END,
    COUNT(*)::bigint,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        jsonb_build_object(
          'active_count', COUNT(*) FILTER (WHERE status = 'active'),
          'inactive_count', COUNT(*) FILTER (WHERE status != 'active'),
          'roles', jsonb_agg(DISTINCT staff_type)
        )
      ELSE NULL
    END
  FROM staff;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_dashboard_data_health() TO authenticated;

-- Run diagnostics
SELECT * FROM check_dashboard_data_health();