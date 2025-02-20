-- Step 0: Begin transaction
BEGIN;

-- Step 1: Create the new function with auth.uid() parameter
CREATE OR REPLACE FUNCTION is_super_admin_check()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = auth.uid()
  );
END;
$$;

-- Step 2: Update the staff policy to use the new function
DROP POLICY IF EXISTS "Super admin has full access" ON staff;
CREATE POLICY "Super admin has full access" ON staff
  USING (is_super_admin_check());

-- Step 3: Now we can safely drop the old function
DROP FUNCTION IF EXISTS is_super_admin();

-- Step 4: Create the internal role check function
CREATE OR REPLACE FUNCTION get_user_role_v2(check_auth_id uuid)
RETURNS TABLE (
  role_type text,
  id uuid,
  is_super_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First check if user is a super admin
  IF EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = check_auth_id
  ) THEN
    RETURN QUERY
    SELECT 
      'super_admin'::text as role_type,
      sa.id,
      true as is_super_admin
    FROM super_admin sa
    WHERE sa.auth_id = check_auth_id;
    RETURN;
  END IF;

  -- If not super admin, return empty result
  RETURN QUERY
  SELECT 
    'none'::text as role_type,
    NULL::uuid as id,
    false as is_super_admin
  WHERE false;
END;
$$;

-- Step 5: Update or create the main user role function
CREATE OR REPLACE FUNCTION get_user_role(check_auth_id uuid)
RETURNS TABLE (
  role_type text,
  id uuid,
  is_super_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM get_user_role_v2(check_auth_id);
END;
$$;

-- Step 6: Create the updated super admin check function
CREATE OR REPLACE FUNCTION is_super_admin(check_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role record;
BEGIN
  SELECT * INTO v_role FROM get_user_role_v2(check_auth_id) LIMIT 1;
  RETURN COALESCE(v_role.is_super_admin, false);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_super_admin_check() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin(uuid) TO authenticated;

-- Add comments
COMMENT ON FUNCTION is_super_admin_check IS 'Internal function to check current user super admin status';
COMMENT ON FUNCTION get_user_role_v2 IS 'Internal function to check user role status';
COMMENT ON FUNCTION get_user_role IS 'Gets user role and super admin status';
COMMENT ON FUNCTION is_super_admin IS 'Checks if a specified user is a super admin';

-- Verify policies are updated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_catalog.pg_policies 
    WHERE policyname = 'Super admin has full access' 
    AND tablename = 'staff'
  ) THEN
    RAISE EXCEPTION 'Staff policy not properly updated';
  END IF;
END;
$$;

-- Test the functions
DO $$
DECLARE
  v_result boolean;
  v_role record;
BEGIN
  -- Test is_super_admin_check
  v_result := is_super_admin_check();
  
  -- Test get_user_role
  SELECT * INTO v_role FROM get_user_role(auth.uid()) LIMIT 1;
  
  -- Test is_super_admin
  v_result := is_super_admin(auth.uid());
  
  RAISE NOTICE 'Function tests completed successfully';
END;
$$;

COMMIT;