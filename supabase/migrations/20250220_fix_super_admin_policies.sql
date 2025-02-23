-- Begin transaction
BEGIN;

-- Drop any conflicting policies
DROP POLICY IF EXISTS "Super admins can view their own record" ON super_admin;
DROP POLICY IF EXISTS "Super admins can add new super admins" ON super_admin;
DROP POLICY IF EXISTS "Super admins can manage super admin records" ON super_admin;

-- Enable RLS on super_admin table
ALTER TABLE super_admin ENABLE ROW LEVEL SECURITY;

-- Basic view policy - super admins can view all super admin records
CREATE POLICY "Super admins can view their own record" ON super_admin
  FOR SELECT
  USING (
    auth_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM super_admin 
      WHERE auth_id = auth.uid()
    )
  );

-- Only existing super admins can create new ones
CREATE POLICY "Super admins can add new super admins" ON super_admin
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admin 
      WHERE auth_id = auth.uid()
    )
  );

-- Super admins can only modify records they own
CREATE POLICY "Super admins can manage super admin records" ON super_admin
  FOR UPDATE
  USING (
    auth_id = auth.uid()
  )
  WITH CHECK (
    auth_id = auth.uid()
  );

-- Super admin activity policies
DROP POLICY IF EXISTS "Super admins can view activity logs" ON super_admin_activity;
DROP POLICY IF EXISTS "System can create activity logs" ON super_admin_activity;

-- Enable RLS on super_admin_activity table
ALTER TABLE super_admin_activity ENABLE ROW LEVEL SECURITY;

-- Activity log viewing policy
CREATE POLICY "Super admins can view activity logs" ON super_admin_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM super_admin 
      WHERE auth_id = auth.uid()
    )
  );

-- Activity log creation policy
CREATE POLICY "System can create activity logs" ON super_admin_activity
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admin 
      WHERE auth_id = auth.uid()
    )
  );

-- Create function to log super admin activity
CREATE OR REPLACE FUNCTION log_super_admin_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_super_admin_id uuid;
BEGIN
  -- Get super admin id
  SELECT id INTO v_super_admin_id
  FROM super_admin
  WHERE auth_id = auth.uid();

  -- Log the activity
  INSERT INTO super_admin_activity (
    super_admin_id,
    action_type,
    action_details,
    ip_address
  ) VALUES (
    v_super_admin_id,
    TG_OP,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'new_data', to_jsonb(NEW),
      'old_data', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE null END
    ),
    current_setting('request.headers', true)::json->>'x-forwarded-for'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for activity logging
DROP TRIGGER IF EXISTS log_super_admin_changes ON super_admin;
CREATE TRIGGER log_super_admin_changes
  AFTER INSERT OR UPDATE OR DELETE ON super_admin
  FOR EACH ROW
  EXECUTE FUNCTION log_super_admin_activity();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON super_admin TO authenticated;
GRANT ALL ON super_admin_activity TO authenticated;

-- Add helpful comments
COMMENT ON TABLE super_admin IS 'System administrators with full system access';
COMMENT ON TABLE super_admin_activity IS 'Audit log for super admin actions';

COMMIT;