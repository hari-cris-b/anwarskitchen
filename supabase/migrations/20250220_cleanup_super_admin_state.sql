-- Begin transaction
BEGIN;

-- First, drop all policies with cascade to ensure clean slate
DROP POLICY IF EXISTS "Super admins can view all records" ON super_admin CASCADE;
DROP POLICY IF EXISTS "Super admins can view all super admin records" ON super_admin CASCADE;
DROP POLICY IF EXISTS "Super admins can add new super admins" ON super_admin CASCADE;
DROP POLICY IF EXISTS "Super admins can manage super admin records" ON super_admin CASCADE;
DROP POLICY IF EXISTS "Super admins can manage their own records" ON super_admin CASCADE;
DROP POLICY IF EXISTS "Super admins can view activity logs" ON super_admin_activity CASCADE;
DROP POLICY IF EXISTS "System can create activity logs" ON super_admin_activity CASCADE;

-- Drop functions with cascade
DROP FUNCTION IF EXISTS is_super_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS check_super_admin(uuid) CASCADE;

-- Disable RLS temporarily to ensure we can clean up
ALTER TABLE IF EXISTS super_admin DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS super_admin_activity DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE IF EXISTS super_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS super_admin_activity ENABLE ROW LEVEL SECURITY;

-- Create base function for super admin checks
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

-- Recreate all policies fresh
CREATE POLICY "Super admins can view all records" ON super_admin
  FOR SELECT
  USING (
    auth_id = auth.uid() OR
    is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can add new super admins" ON super_admin
  FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can manage their own records" ON super_admin
  FOR UPDATE
  USING (
    auth_id = auth.uid()
  )
  WITH CHECK (
    auth_id = auth.uid()
  );

CREATE POLICY "Super admins can view activity logs" ON super_admin_activity
  FOR SELECT
  USING (
    is_super_admin(auth.uid())
  );

CREATE POLICY "System can create activity logs" ON super_admin_activity
  FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid())
  );

COMMIT;