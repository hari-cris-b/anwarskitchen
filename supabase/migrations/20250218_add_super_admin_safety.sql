-- Create super admin activity log table
CREATE TABLE IF NOT EXISTS super_admin_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  super_admin_id uuid REFERENCES super_admin(id),
  action_type text NOT NULL,
  action_details jsonb NOT NULL,
  ip_address text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_action_type CHECK (action_type IN ('login', 'franchise_create', 'franchise_update', 'franchise_delete', 'staff_manage', 'settings_update', 'report_access'))
);

-- Create index for activity queries
CREATE INDEX idx_super_admin_activity_admin_id ON super_admin_activity(super_admin_id);
CREATE INDEX idx_super_admin_activity_type ON super_admin_activity(action_type);
CREATE INDEX idx_super_admin_activity_created ON super_admin_activity(created_at DESC);

-- Function to log super admin activity
CREATE OR REPLACE FUNCTION log_super_admin_activity(
  p_super_admin_id uuid,
  p_action_type text,
  p_action_details jsonb,
  p_ip_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id uuid;
BEGIN
  INSERT INTO super_admin_activity (
    super_admin_id,
    action_type,
    action_details,
    ip_address
  ) VALUES (
    p_super_admin_id,
    p_action_type,
    p_action_details,
    p_ip_address
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

-- Function to prevent removal of last super admin
CREATE OR REPLACE FUNCTION prevent_last_super_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM super_admin WHERE auth_id IS NOT NULL) <= 1 AND OLD.auth_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot remove the last linked super admin account';
  END IF;
  RETURN OLD;
END;
$$;

-- Add trigger for last super admin protection
CREATE TRIGGER protect_last_super_admin
  BEFORE DELETE OR UPDATE OF auth_id ON super_admin
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_super_admin_removal();

-- Function to check if any super admin exists
CREATE OR REPLACE FUNCTION has_active_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admin WHERE auth_id IS NOT NULL
  );
END;
$$;

-- Add RLS policies for activity log
ALTER TABLE super_admin_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all activity logs"
ON super_admin_activity FOR SELECT
USING (check_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert activity logs"
ON super_admin_activity FOR INSERT
WITH CHECK (check_super_admin(auth.uid()));

-- Add comments
COMMENT ON TABLE super_admin_activity IS 'Logs all super admin actions for audit purposes';
COMMENT ON FUNCTION log_super_admin_activity IS 'Records super admin activities with details';
COMMENT ON FUNCTION prevent_last_super_admin_removal IS 'Prevents system from having no super admin';
COMMENT ON FUNCTION has_active_super_admin IS 'Checks if system has any active super admin';

-- Grant permissions
GRANT SELECT ON super_admin_activity TO authenticated;
GRANT INSERT ON super_admin_activity TO authenticated;
GRANT EXECUTE ON FUNCTION log_super_admin_activity TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_super_admin TO authenticated;