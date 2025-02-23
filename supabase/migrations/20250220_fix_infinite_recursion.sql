-- Begin transaction
BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can view their own record" ON super_admin;
DROP POLICY IF EXISTS "Super admins can add new super admins" ON super_admin;
DROP POLICY IF EXISTS "Super admins can manage super admin records" ON super_admin;

-- Drop existing functions with CASCADE to remove dependent objects
DROP FUNCTION IF EXISTS is_super_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS check_super_admin(uuid) CASCADE;

-- Create an efficient super admin check function
CREATE OR REPLACE FUNCTION is_super_admin(check_auth_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Direct lookup without policy check to prevent recursion
  SELECT EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = check_auth_id
  );
$$;

-- Basic view policy - super admins can view all super admin records
CREATE POLICY "Super admins can view all records" ON super_admin
  FOR SELECT
  USING (
    -- Initial user can always see their own record
    auth_id = auth.uid() OR
    -- Use direct check function for other records
    is_super_admin(auth.uid())
  );

-- Only existing super admins can create new ones
CREATE POLICY "Super admins can add new super admins" ON super_admin
  FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid())
  );

-- Super admins can only modify their own records
CREATE POLICY "Super admins can manage their own records" ON super_admin
  FOR UPDATE
  USING (
    auth_id = auth.uid()
  )
  WITH CHECK (
    auth_id = auth.uid()
  );

-- Update activity log policies to use new function
DROP POLICY IF EXISTS "Super admins can view activity logs" ON super_admin_activity;
CREATE POLICY "Super admins can view activity logs" ON super_admin_activity
  FOR SELECT
  USING (
    is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "System can create activity logs" ON super_admin_activity;
CREATE POLICY "System can create activity logs" ON super_admin_activity
  FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid())
  );

-- Create an alias for backward compatibility
CREATE OR REPLACE FUNCTION check_super_admin(check_auth_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin(check_auth_id);
$$;

COMMIT;