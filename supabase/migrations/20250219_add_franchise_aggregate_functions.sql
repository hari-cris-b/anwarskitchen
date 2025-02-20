-- Get active staff counts by franchise
CREATE OR REPLACE FUNCTION get_active_staff_counts()
RETURNS TABLE (
    franchise_id uuid,
    count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is super admin
    IF NOT EXISTS (
        SELECT 1 FROM super_admin sa
        WHERE sa.auth_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: Super admin privileges required';
    END IF;

    RETURN QUERY
    SELECT 
        s.franchise_id,
        COUNT(*) as count
    FROM staff s
    WHERE s.status = 'active'
    GROUP BY s.franchise_id;
END;
$$;

-- Get revenue totals by franchise
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
    -- Check if user is super admin
    IF NOT EXISTS (
        SELECT 1 FROM super_admin sa
        WHERE sa.auth_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: Super admin privileges required';
    END IF;

    RETURN QUERY
    SELECT 
        o.franchise_id,
        COALESCE(SUM(o.total), 0) as total_revenue
    FROM orders o
    GROUP BY o.franchise_id;
END;
$$;

-- Get staff count for a specific franchise
CREATE OR REPLACE FUNCTION get_franchise_staff_count(p_franchise_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count bigint;
BEGIN
    -- Check if user is super admin
    IF NOT EXISTS (
        SELECT 1 FROM super_admin sa
        WHERE sa.auth_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: Super admin privileges required';
    END IF;

    SELECT COUNT(*)
    INTO v_count
    FROM staff s
    WHERE s.franchise_id = p_franchise_id
    AND s.status = 'active';

    RETURN v_count;
END;
$$;

-- Get order stats for a specific franchise
CREATE OR REPLACE FUNCTION get_franchise_order_stats(p_franchise_id uuid)
RETURNS TABLE (
    total_orders bigint,
    total_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is super admin
    IF NOT EXISTS (
        SELECT 1 FROM super_admin sa
        WHERE sa.auth_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: Super admin privileges required';
    END IF;

    RETURN QUERY
    SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue
    FROM orders o
    WHERE o.franchise_id = p_franchise_id;
END;
$$;

-- Get total active staff count across all franchises
CREATE OR REPLACE FUNCTION get_total_active_staff_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count bigint;
BEGIN
    -- Check if user is super admin
    IF NOT EXISTS (
        SELECT 1 FROM super_admin sa
        WHERE sa.auth_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: Super admin privileges required';
    END IF;

    SELECT COUNT(*)
    INTO v_count
    FROM staff s
    WHERE s.status = 'active';

    RETURN v_count;
END;
$$;

-- Get total revenue for last 30 days
CREATE OR REPLACE FUNCTION get_total_revenue_last_30_days()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total numeric;
BEGIN
    -- Check if user is super admin
    IF NOT EXISTS (
        SELECT 1 FROM super_admin sa
        WHERE sa.auth_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: Super admin privileges required';
    END IF;

    SELECT COALESCE(SUM(total), 0)
    INTO v_total
    FROM orders o
    WHERE o.created_at >= NOW() - INTERVAL '30 days';

    RETURN v_total;
END;
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can read orders" ON orders;
DROP POLICY IF EXISTS "Super admins can read staff" ON staff;

-- Add RLS policies for super admin access
CREATE POLICY "Super admins can read orders"
ON orders FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM super_admin sa
        WHERE sa.auth_id = auth.uid()
    )
);

CREATE POLICY "Super admins can read staff"
ON staff FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM super_admin sa
        WHERE sa.auth_id = auth.uid()
    )
);

-- Revoke and grant function execution permissions
DO $$ 
BEGIN
    -- Revoke public access
    EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC');

    -- Grant access to authenticated users for specific functions
    EXECUTE format('GRANT EXECUTE ON FUNCTION get_active_staff_counts TO authenticated');
    EXECUTE format('GRANT EXECUTE ON FUNCTION get_franchise_revenue_totals TO authenticated');
    EXECUTE format('GRANT EXECUTE ON FUNCTION get_franchise_staff_count TO authenticated');
    EXECUTE format('GRANT EXECUTE ON FUNCTION get_franchise_order_stats TO authenticated');
    EXECUTE format('GRANT EXECUTE ON FUNCTION get_total_active_staff_count TO authenticated');
    EXECUTE format('GRANT EXECUTE ON FUNCTION get_total_revenue_last_30_days TO authenticated');
END $$;