-- Drop existing triggers first
DROP TRIGGER IF EXISTS check_role_conflict_super_admin ON super_admin;
DROP TRIGGER IF EXISTS check_role_conflict_staff ON staff;

-- Then drop functions
DROP FUNCTION IF EXISTS get_user_role(uuid);
DROP FUNCTION IF EXISTS is_super_admin(uuid);
DROP FUNCTION IF EXISTS prevent_role_conflict();

-- Create enhanced functions for role management
CREATE OR REPLACE FUNCTION get_user_role(check_auth_id uuid)
RETURNS TABLE(role_type text, id uuid, is_super_admin boolean)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify auth.users exists first
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'auth' 
    AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION 'Auth schema not properly configured';
  END IF;

  -- Verify user exists in auth.users
  IF NOT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = check_auth_id
  ) THEN
    RAISE EXCEPTION 'User not found in auth system';
  END IF;

  RETURN QUERY
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM super_admin WHERE auth_id = check_auth_id) THEN 'super_admin'::text
      WHEN EXISTS (SELECT 1 FROM staff WHERE auth_id = check_auth_id) THEN 'staff'::text
      ELSE 'regular'::text
    END AS role_type,
    check_auth_id AS id,
    EXISTS (SELECT 1 FROM super_admin WHERE auth_id = check_auth_id) AS is_super_admin;
END;
$$;

-- Function to check if a user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin(check_auth_id uuid)
RETURNS boolean
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify auth.users exists first
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'auth' 
    AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION 'Auth schema not properly configured';
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM super_admin sa
    JOIN auth.users au ON au.id = sa.auth_id
    WHERE sa.auth_id = check_auth_id
  );
END;
$$;

-- Set up super_admin table privileges
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON super_admin TO authenticated;
GRANT UPDATE ON super_admin TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO authenticated;

-- Create trigger function to prevent role conflicts
CREATE OR REPLACE FUNCTION prevent_role_conflict()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify user exists in auth.users
  IF NOT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = NEW.auth_id
  ) THEN
    RAISE EXCEPTION 'User not found in auth system';
  END IF;

  -- Check if the user has any other role assignments
  IF EXISTS (
    SELECT 1 
    FROM staff 
    WHERE auth_id = NEW.auth_id
  ) THEN
    RAISE EXCEPTION 'User cannot be both a super admin and staff member';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the triggers
CREATE TRIGGER check_role_conflict_super_admin
  BEFORE INSERT OR UPDATE ON super_admin
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_conflict();

-- Recreate staff trigger if it was previously using the same function
CREATE TRIGGER check_role_conflict_staff
  BEFORE INSERT OR UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_conflict();

-- Ensure RLS is enabled
ALTER TABLE super_admin ENABLE ROW LEVEL SECURITY;

-- Create policies for super_admin table
CREATE POLICY super_admin_read_policy ON super_admin
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY super_admin_update_policy ON super_admin
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);