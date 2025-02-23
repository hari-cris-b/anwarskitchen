-- Begin transaction
BEGIN;

-- Drop existing functions that need to be updated
DROP FUNCTION IF EXISTS is_super_admin_role() CASCADE;
DROP FUNCTION IF EXISTS get_staff_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS check_staff_access(uuid) CASCADE;
DROP FUNCTION IF EXISTS check_staff_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS check_staff_franchise_access(uuid, uuid) CASCADE;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_staff_type staff_role;
BEGIN
    SELECT staff_type INTO v_staff_type
    FROM staff
    WHERE auth_id = auth.uid();

    RETURN v_staff_type = 'super_admin'::staff_role;
EXCEPTION 
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- Function to get staff role
CREATE OR REPLACE FUNCTION get_staff_role(p_auth_id uuid)
RETURNS staff_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_staff_type staff_role;
BEGIN
    SELECT staff_type INTO v_staff_type
    FROM staff
    WHERE auth_id = p_auth_id;
    
    RETURN COALESCE(v_staff_type, 'staff'::staff_role);
END;
$$;

-- Function to check if staff has access to a specific franchise
CREATE OR REPLACE FUNCTION check_staff_franchise_access(p_auth_id uuid, p_franchise_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM staff 
        WHERE auth_id = p_auth_id 
        AND (
            franchise_id = p_franchise_id 
            OR staff_type = 'super_admin'::staff_role
        )
    );
END;
$$;

-- Update RLS policies to use new enum type
DROP POLICY IF EXISTS "Super admins can access all franchises" ON franchises;
CREATE POLICY "Super admins can access all franchises" ON franchises
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM staff 
            WHERE auth_id = auth.uid() 
            AND staff_type = 'super_admin'::staff_role
        )
    );

-- Ensure proper grants
GRANT EXECUTE ON FUNCTION is_super_admin_role TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_role TO authenticated;
GRANT EXECUTE ON FUNCTION check_staff_franchise_access TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION is_super_admin_role() IS 'Checks if current user has super admin role using staff_role enum';
COMMENT ON FUNCTION get_staff_role(uuid) IS 'Gets staff role for given auth_id using staff_role enum';
COMMENT ON FUNCTION check_staff_franchise_access(uuid, uuid) IS 'Checks if staff member has access to specific franchise';

COMMIT;