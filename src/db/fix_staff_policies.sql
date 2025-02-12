-- Drop existing policies and functions
DROP POLICY IF EXISTS "Staff view own franchise data" ON staff;
DROP POLICY IF EXISTS "Managers can modify staff data" ON staff;
DROP POLICY IF EXISTS "staff_access_policy" ON staff;
DROP FUNCTION IF EXISTS check_staff_access;

-- Create a security definer function to check staff access
-- This function bypasses RLS and safely checks permissions
CREATE OR REPLACE FUNCTION check_staff_access(auth_uid UUID, target_franchise_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_franchise_id UUID;
    user_role TEXT;
BEGIN
    -- Get the user's franchise and role directly
    SELECT franchise_id, role
    INTO user_franchise_id, user_role
    FROM staff
    WHERE auth_id = auth_uid
    LIMIT 1;

    -- Return true if:
    -- 1. User is admin/manager of the target franchise
    -- 2. Or if they're accessing their own franchise's data
    RETURN (
        user_franchise_id = target_franchise_id AND
        user_role IN ('admin', 'manager')
    );
END;
$$;

-- Create a simplified policy using the security definer function
CREATE POLICY "staff_access_policy" ON staff
    FOR ALL TO authenticated
    USING (
        -- Allow if user is accessing their own record
        auth.uid() = auth_id
        OR
        -- Or if they have proper franchise access
        check_staff_access(auth.uid(), franchise_id)
    );

-- Add indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_staff_auth_id ON staff(auth_id);
CREATE INDEX IF NOT EXISTS idx_staff_franchise_role ON staff(franchise_id, role);