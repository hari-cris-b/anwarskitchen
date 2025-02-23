-- Begin transaction
BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow reading own super admin record" ON super_admin CASCADE;
DROP POLICY IF EXISTS "Super admin can manage records" ON super_admin CASCADE;
DROP POLICY IF EXISTS "Super admin can view activity logs" ON super_admin_activity CASCADE;
DROP POLICY IF EXISTS "Super admin can create activity logs" ON super_admin_activity CASCADE;

-- Temporarily disable RLS to ensure we can clean up
ALTER TABLE super_admin DISABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin_activity DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE super_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin_activity ENABLE ROW LEVEL SECURITY;

-- Create more permissive select policy for auth
CREATE POLICY "Allow reading super admin records during auth" ON super_admin
  FOR SELECT
  USING (true);  -- Allow reading during authentication

-- Create strict policy for modifications
CREATE POLICY "Super admin can modify records" ON super_admin
  FOR ALL
  USING (
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    is_super_admin(auth.uid())
  );

-- Activity log policies
CREATE POLICY "Super admin can view logs" ON super_admin_activity
  FOR SELECT
  USING (
    is_super_admin(auth.uid())
  );

CREATE POLICY "Super admin can log activity" ON super_admin_activity
  FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid())
  );

COMMIT;