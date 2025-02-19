-- Function to check if user is already a super admin
CREATE OR REPLACE FUNCTION check_user_super_admin(check_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admin WHERE auth_id = check_auth_id
  );
END;
$$;

-- Function to check if user is already a staff member
CREATE OR REPLACE FUNCTION check_user_staff(check_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff WHERE auth_id = check_auth_id
  );
END;
$$;

-- Add trigger to prevent staff from being super admin
CREATE OR REPLACE FUNCTION prevent_staff_super_admin_overlap()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.auth_id != OLD.auth_id THEN
    IF check_user_staff(NEW.auth_id) THEN
      RAISE EXCEPTION 'User is already a staff member';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_super_admin_overlap
  BEFORE INSERT OR UPDATE ON super_admin
  FOR EACH ROW
  EXECUTE FUNCTION prevent_staff_super_admin_overlap();

-- Add trigger to prevent super admin from being staff
CREATE OR REPLACE FUNCTION prevent_super_admin_staff_overlap()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.auth_id != OLD.auth_id THEN
    IF check_user_super_admin(NEW.auth_id) THEN
      RAISE EXCEPTION 'User is already a super admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_staff_overlap
  BEFORE INSERT OR UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION prevent_super_admin_staff_overlap();

-- Add comments
COMMENT ON FUNCTION check_user_super_admin IS 'Checks if a user is registered as a super admin';
COMMENT ON FUNCTION check_user_staff IS 'Checks if a user is registered as a staff member';
COMMENT ON FUNCTION prevent_staff_super_admin_overlap IS 'Prevents staff members from being added as super admins';
COMMENT ON FUNCTION prevent_super_admin_staff_overlap IS 'Prevents super admins from being added as staff members';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_staff(uuid) TO authenticated;