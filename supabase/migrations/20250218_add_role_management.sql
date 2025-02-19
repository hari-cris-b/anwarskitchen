-- Function to check user roles safely
CREATE OR REPLACE FUNCTION get_user_role(check_auth_id uuid)
RETURNS TABLE (
  role_type text,
  id uuid,
  is_super_admin boolean
) AS $$
BEGIN
  -- First check super admin
  IF EXISTS (SELECT 1 FROM super_admin WHERE auth_id = check_auth_id) THEN
    RETURN QUERY
    SELECT 
      'super_admin'::text,
      sa.id,
      true
    FROM super_admin sa
    WHERE sa.auth_id = check_auth_id;
    RETURN;
  END IF;

  -- Then check staff
  RETURN QUERY
  SELECT 
    s.staff_type::text,
    s.id,
    false
  FROM staff s
  WHERE s.auth_id = check_auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to prevent role conflicts
CREATE OR REPLACE FUNCTION prevent_role_conflict()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.auth_id != OLD.auth_id THEN
    IF EXISTS (
      SELECT 1 FROM get_user_role(NEW.auth_id)
      WHERE role_type IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'User already has a role in the system';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for both tables
DROP TRIGGER IF EXISTS prevent_staff_role_conflict ON staff;
CREATE TRIGGER prevent_staff_role_conflict
  BEFORE INSERT OR UPDATE OF auth_id ON staff
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_conflict();

DROP TRIGGER IF EXISTS prevent_super_admin_role_conflict ON super_admin;
CREATE TRIGGER prevent_super_admin_role_conflict
  BEFORE INSERT OR UPDATE OF auth_id ON super_admin
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_conflict();

-- Function to check if user can access role
CREATE OR REPLACE FUNCTION can_access_role(
  check_auth_id uuid,
  required_role text
)
RETURNS boolean AS $$
DECLARE
  v_role record;
BEGIN
  SELECT * INTO v_role 
  FROM get_user_role(check_auth_id) 
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Super admin can access everything
  IF v_role.is_super_admin THEN
    RETURN true;
  END IF;

  -- For staff, check specific role
  RETURN v_role.role_type = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely get user's permissions
CREATE OR REPLACE FUNCTION get_user_permissions(check_auth_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_role record;
  v_permissions jsonb;
BEGIN
  SELECT * INTO v_role 
  FROM get_user_role(check_auth_id) 
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_role.is_super_admin THEN
    RETURN jsonb_build_object(
      'can_access_pos', true,
      'can_access_kitchen', true,
      'can_access_reports', true,
      'can_manage_menu', true,
      'can_manage_staff', true,
      'is_super_admin', true
    );
  END IF;

  -- For staff, get stored permissions
  SELECT permissions INTO v_permissions
  FROM staff
  WHERE id = v_role.id;

  RETURN v_permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions(uuid) TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_user_role IS 'Returns user role info including super admin status';
COMMENT ON FUNCTION prevent_role_conflict IS 'Prevents users from having multiple roles';
COMMENT ON FUNCTION can_access_role IS 'Checks if user can access a specific role';
COMMENT ON FUNCTION get_user_permissions IS 'Returns user permissions including super admin status';