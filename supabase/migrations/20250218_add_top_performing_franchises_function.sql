CREATE OR REPLACE FUNCTION get_top_performing_franchises(days_ago integer, limit_count integer)
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
  RETURN QUERY
  WITH filtered_orders AS (
    SELECT 
      o.franchise_id,
      COUNT(*) as order_count,
      SUM(o.total) as total_revenue,
      AVG(o.total) as avg_order_value
    FROM orders o
    WHERE 
      o.created_at >= (CURRENT_TIMESTAMP - (days_ago || ' days')::interval)
      AND o.status != 'cancelled'::order_status
    GROUP BY o.franchise_id
  )
  SELECT 
    f.id as franchise_id,
    f.name as franchise_name,
    COALESCE(fo.total_revenue, 0) as total_revenue,
    COALESCE(fo.order_count, 0) as order_count,
    COALESCE(fo.avg_order_value, 0) as average_order_value
  FROM franchises f
  LEFT JOIN filtered_orders fo ON f.id = fo.franchise_id
  WHERE f.settings->>'subscription_status' = 'active'
  ORDER BY fo.total_revenue DESC NULLS LAST
  LIMIT limit_count;
END;
$$;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS is_super_admin(uuid);

-- Create admin status type if not exists
DO $$ BEGIN
  CREATE TYPE public.admin_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create new function with explicit parameter name
CREATE OR REPLACE FUNCTION check_super_admin(check_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = check_auth_id
  );
END;
$$;

-- Create function to add new super admin
CREATE OR REPLACE FUNCTION add_super_admin(
  p_email text,
  p_full_name text,
  p_auth_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid;
BEGIN
  -- Check if caller is super admin
  IF NOT check_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can add other super admins';
  END IF;

  -- Insert new super admin
  INSERT INTO super_admin (
    email,
    full_name,
    auth_id
  ) VALUES (
    p_email,
    p_full_name,
    p_auth_id
  )
  RETURNING id INTO v_super_admin_id;

  RETURN v_super_admin_id;
END;
$$;

-- Update RLS policies to use new function name
ALTER TABLE public.super_admin ENABLE ROW LEVEL SECURITY;

-- Super admins can read all super_admin records
CREATE POLICY "Super admins can view all super admin records" ON public.super_admin
FOR SELECT USING (check_super_admin(auth.uid()));

-- Super admins can insert new super_admin records
CREATE POLICY "Super admins can add new super admins" ON public.super_admin
FOR INSERT WITH CHECK (check_super_admin(auth.uid()));

-- Super admins can update super_admin records
CREATE POLICY "Super admins can update super admin records" ON public.super_admin
FOR UPDATE USING (check_super_admin(auth.uid()));

-- Super admins can delete super_admin records
CREATE POLICY "Super admins can delete super admin records" ON public.super_admin
FOR DELETE USING (check_super_admin(auth.uid()));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION add_super_admin(text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_performing_franchises(integer, integer) TO authenticated;

-- Add comments
COMMENT ON FUNCTION check_super_admin IS 'Checks if a user is a super admin';
COMMENT ON FUNCTION add_super_admin IS 'Adds a new super admin (only callable by existing super admins)';
COMMENT ON FUNCTION get_top_performing_franchises IS 'Gets top performing franchises based on revenue for a given time period';

-- Create default super admin if none exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM super_admin LIMIT 1) THEN
    INSERT INTO super_admin (email, full_name)
    VALUES ('admin@example.com', 'System Administrator');
  END IF;
END
$$;