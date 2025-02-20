BEGIN;

-- Create function to verify super admin setup
CREATE OR REPLACE FUNCTION verify_super_admin_setup(p_auth_id uuid)
RETURNS TABLE (
  check_type text,
  status text,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check basic super admin entry exists
  IF EXISTS (
    SELECT 1 FROM super_admin WHERE auth_id = p_auth_id
  ) THEN
    RETURN QUERY SELECT 
      'account_exists'::text,
      'Found'::text,
      'Super admin account found'::text;
  ELSE
    RETURN QUERY SELECT 
      'account_exists'::text,
      'Not Found'::text,
      'No super admin account found'::text;
    RETURN;
  END IF;

  -- Check auth link
  IF EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = p_auth_id 
    AND auth_id IS NOT NULL
  ) THEN
    RETURN QUERY SELECT 
      'auth_linked'::text,
      'Linked'::text,
      'Auth account properly linked'::text;
  ELSE
    RETURN QUERY SELECT 
      'auth_linked'::text,
      'Not Linked'::text,
      'Auth account not linked'::text;
    RETURN;
  END IF;

  -- Check role assignment
  IF EXISTS (
    SELECT 1 FROM get_user_role(p_auth_id) 
    WHERE role_type = 'super_admin' 
    AND is_super_admin = true
  ) THEN
    RETURN QUERY SELECT 
      'role_check'::text,
      'Working'::text,
      'Role assignments working correctly'::text;
  ELSE
    RETURN QUERY SELECT 
      'role_check'::text,
      'Not Working'::text,
      'Role assignments not working'::text;
    RETURN;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION verify_super_admin_setup(uuid) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION verify_super_admin_setup IS 'Verifies super admin account setup and permissions';

-- Verify the function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'verify_super_admin_setup'
  ) THEN
    RAISE EXCEPTION 'Function verify_super_admin_setup not created properly';
  END IF;
END
$$;

COMMIT;