-- Function to clean up unlinked super admin accounts
CREATE OR REPLACE FUNCTION cleanup_unlinked_super_admins()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete super admin records that have no auth_id after 24 hours
  DELETE FROM super_admin
  WHERE auth_id IS NULL
  AND created_at < now() - interval '24 hours';
END;
$$;

-- Add job to run cleanup every day
SELECT cron.schedule(
  'cleanup-unlinked-super-admins',
  '0 0 * * *', -- Run at midnight every day
  'SELECT cleanup_unlinked_super_admins()'
);

-- Function to handle role conflicts
CREATE OR REPLACE FUNCTION handle_role_conflict()
RETURNS trigger AS $$
DECLARE
  existing_role text;
  operation text;
BEGIN
  -- Check if user exists in staff table
  SELECT 'staff' INTO existing_role
  FROM staff
  WHERE auth_id = NEW.auth_id;

  -- If not found, check super_admin table
  IF existing_role IS NULL THEN
    SELECT 'super_admin' INTO existing_role
    FROM super_admin
    WHERE auth_id = NEW.auth_id;
  END IF;

  -- Get the current operation (staff or super_admin)
  IF TG_TABLE_NAME = 'staff' THEN
    operation := 'staff';
  ELSE
    operation := 'super_admin';
  END IF;

  -- Raise appropriate error message
  IF existing_role IS NOT NULL AND existing_role != operation THEN
    RAISE EXCEPTION 'User is already registered as %. Cannot be registered as % simultaneously.',
      existing_role,
      operation;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add more specific triggers for role conflict
DROP TRIGGER IF EXISTS check_super_admin_overlap ON super_admin;
DROP TRIGGER IF EXISTS check_staff_overlap ON staff;

CREATE TRIGGER check_role_conflict_super_admin
  BEFORE INSERT OR UPDATE ON super_admin
  FOR EACH ROW
  EXECUTE FUNCTION handle_role_conflict();

CREATE TRIGGER check_role_conflict_staff
  BEFORE INSERT OR UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION handle_role_conflict();

-- Add indexes for role checking
CREATE INDEX IF NOT EXISTS idx_staff_auth_roles ON staff (auth_id) WHERE auth_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_super_admin_auth_roles ON super_admin (auth_id) WHERE auth_id IS NOT NULL;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_unlinked_super_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_role_conflict() TO authenticated;

-- Comments
COMMENT ON FUNCTION cleanup_unlinked_super_admins IS 'Removes super admin records that were never linked to an auth account';
COMMENT ON FUNCTION handle_role_conflict IS 'Prevents users from having multiple roles in the system';

-- Initial cleanup
SELECT cleanup_unlinked_super_admins();