-- Begin transaction
BEGIN;

-- First drop all existing policies
DROP POLICY IF EXISTS "Super admins can view all records" ON super_admin CASCADE;
DROP POLICY IF EXISTS "Super admins can view all super admin records" ON super_admin CASCADE;
DROP POLICY IF EXISTS "Super admins can add new super admins" ON super_admin CASCADE;
DROP POLICY IF EXISTS "Super admins can manage their own records" ON super_admin CASCADE;
DROP POLICY IF EXISTS "Super admins can view activity logs" ON super_admin_activity CASCADE;
DROP POLICY IF EXISTS "System can create activity logs" ON super_admin_activity CASCADE;

-- Drop functions with cascade
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
  -- Direct lookup without recursion
  SELECT EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = check_auth_id
  );
$$;

-- Create backward compatibility function
CREATE OR REPLACE FUNCTION check_super_admin(check_auth_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin(check_auth_id);
$$;

-- Create policy to allow reading own record during login
CREATE POLICY "Allow reading own super admin record" ON super_admin
  FOR SELECT
  USING (
    auth_id = auth.uid()
  );

-- Once authenticated as super admin, allow managing records
CREATE POLICY "Super admin can manage records" ON super_admin
  FOR ALL
  USING (
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    is_super_admin(auth.uid())
  );

-- Activity log policies
CREATE POLICY "Super admin can view activity logs" ON super_admin_activity
  FOR SELECT
  USING (
    is_super_admin(auth.uid())
  );

CREATE POLICY "Super admin can create activity logs" ON super_admin_activity
  FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid())
  );

COMMIT;