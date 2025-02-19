-- Create type for super admin status
CREATE TYPE public.admin_status AS ENUM ('active', 'inactive', 'suspended');

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = user_id
  );
END;
$$;

-- Create function to add new super admin
CREATE OR REPLACE FUNCTION add_super_admin(
  p_email text,
  p_full_name text,
  p_auth_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid;
BEGIN
  -- Check if caller is super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can add other super admins';
  END IF;

  -- Insert new super admin
  INSERT INTO super_admin (
    email,
    full_name,
    auth_id
  ) VALUES (
    p_email,
    p_full_name,
    p_auth_id
  )
  RETURNING id INTO v_super_admin_id;

  RETURN v_super_admin_id;
END;
$$;

-- Add super admin RLS policies
ALTER TABLE public.super_admin ENABLE ROW LEVEL SECURITY;

-- Super admins can read all super_admin records
CREATE POLICY "Super admins can view all super admin records" ON public.super_admin
FOR SELECT USING (
  is_super_admin(auth.uid())
);

-- Super admins can insert new super_admin records
CREATE POLICY "Super admins can add new super admins" ON public.super_admin
FOR INSERT WITH CHECK (
  is_super_admin(auth.uid())
);

-- Super admins can update super_admin records
CREATE POLICY "Super admins can update super admin records" ON public.super_admin
FOR UPDATE USING (
  is_super_admin(auth.uid())
);

-- Super admins can delete super_admin records
CREATE POLICY "Super admins can delete super admin records" ON public.super_admin
FOR DELETE USING (
  is_super_admin(auth.uid())
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION add_super_admin(text, text, uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION is_super_admin IS 'Checks if a user is a super admin';
COMMENT ON FUNCTION add_super_admin IS 'Adds a new super admin (only callable by existing super admins)';

-- Create default super admin if none exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM super_admin LIMIT 1) THEN
    INSERT INTO super_admin (email, full_name)
    VALUES ('admin@ak.com', 'System Administrator');
  END IF;
END
$$;