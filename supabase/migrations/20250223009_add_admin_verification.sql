-- Function to verify super admin setup
CREATE OR REPLACE FUNCTION verify_super_admin_setup(p_auth_id uuid)
RETURNS TABLE (
  check_type text,
  status text,
  details text
) AS $$
BEGIN
  -- Check if super admin account exists
  RETURN QUERY
  SELECT 
    'account_exists'::text as check_type,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.super_admin 
        WHERE email = (SELECT email FROM auth.users WHERE id = p_auth_id)
      ) THEN 'Found'::text
      ELSE 'Not Found'::text
    END as status,
    'Super admin account verification'::text as details;

  -- Check if auth is linked
  RETURN QUERY
  SELECT 
    'auth_linked'::text as check_type,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.super_admin 
        WHERE auth_id = p_auth_id
      ) THEN 'Linked'::text
      ELSE 'Not Linked'::text
    END as status,
    'Auth account linkage verification'::text as details;

  -- Check if system functions are working
  RETURN QUERY
  SELECT 
    'system_functions'::text as check_type,
    CASE 
      WHEN is_super_admin(p_auth_id) THEN 'Working'::text
      ELSE 'Not Working'::text
    END as status,
    'System function verification'::text as details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role and super admin status
CREATE OR REPLACE FUNCTION get_user_role(check_auth_id uuid)
RETURNS TABLE (
  role_type text,
  id uuid,
  is_super_admin boolean
) AS $$
BEGIN
  -- First check super admin
  IF EXISTS (
    SELECT 1 FROM public.super_admin 
    WHERE auth_id = check_auth_id
  ) THEN
    RETURN QUERY
    SELECT 
      'super_admin'::text,
      id,
      true
    FROM public.super_admin
    WHERE auth_id = check_auth_id;
    RETURN;
  END IF;

  -- Then check staff
  RETURN QUERY
  SELECT 
    staff_type::text,
    id,
    staff_type = 'super_admin'::staff_role
  FROM public.staff
  WHERE auth_id = check_auth_id
  AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test functions
DO $$
DECLARE
  v_super_admin_id uuid := 'e739b600-aa23-4003-a812-82d9ca747638';
  v_staff_id uuid := 'cdb33d22-f103-4a4d-8603-e6be28c072b5';
  v_setup_check record;
  v_role record;
BEGIN
  -- Test super admin verification
  FOR v_setup_check IN (
    SELECT * FROM verify_super_admin_setup(v_super_admin_id)
  ) LOOP
    ASSERT v_setup_check.status IN ('Found', 'Linked', 'Working'),
      format('Super admin check failed: %s - %s', v_setup_check.check_type, v_setup_check.status);
  END LOOP;

  -- Test super admin role check
  SELECT * INTO v_role FROM get_user_role(v_super_admin_id) LIMIT 1;
  ASSERT v_role.is_super_admin = true, 'Super admin role check failed';
  ASSERT v_role.role_type = 'super_admin', 'Super admin role type incorrect';

  -- Test staff role check
  SELECT * INTO v_role FROM get_user_role(v_staff_id) LIMIT 1;
  ASSERT v_role.is_super_admin = false, 'Staff super admin check failed';
  ASSERT v_role.role_type = 'admin', 'Staff role type incorrect';
END $$;