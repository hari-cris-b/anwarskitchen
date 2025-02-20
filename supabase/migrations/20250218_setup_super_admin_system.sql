-- 1. First: Create types if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_status') THEN
        CREATE TYPE public.admin_status AS ENUM ('active', 'inactive', 'suspended');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
        CREATE TYPE public.staff_role AS ENUM ('super_admin', 'admin', 'manager', 'staff');
    END IF;
END $$;

-- 2. Create super admin table (fundamental structure)
CREATE TABLE IF NOT EXISTS public.super_admin (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_id uuid NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT super_admin_pkey PRIMARY KEY (id),
  CONSTRAINT super_admin_auth_id_key UNIQUE (auth_id),
  CONSTRAINT super_admin_email_key UNIQUE (email),
  CONSTRAINT super_admin_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id)
);

-- 3. Create activity logging table
CREATE TABLE IF NOT EXISTS public.super_admin_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  super_admin_id uuid REFERENCES super_admin(id),
  action_type text NOT NULL,
  action_details jsonb NOT NULL,
  ip_address text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_action_type CHECK (action_type IN (
    'login', 'franchise_create', 'franchise_update', 'franchise_delete', 
    'staff_manage', 'settings_update', 'report_access'
  ))
);

-- 4. Create core check function
CREATE OR REPLACE FUNCTION is_super_admin(check_auth_id uuid)
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

-- 5. Create ensure super admin function
CREATE OR REPLACE FUNCTION ensure_super_admin(
  p_email text DEFAULT 'admin@ak.com',
  p_full_name text DEFAULT 'System Administrator'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid;
BEGIN
  SELECT id INTO v_super_admin_id
  FROM super_admin
  WHERE email = p_email;

  IF NOT FOUND THEN
    INSERT INTO super_admin (
      email,
      full_name
    ) VALUES (
      p_email,
      p_full_name
    )
    RETURNING id INTO v_super_admin_id;
  END IF;

  RETURN v_super_admin_id;
END;
$$;

-- 6. Create auth linking function
CREATE OR REPLACE FUNCTION link_super_admin_with_auth(
  p_email text,
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
  SELECT id INTO v_super_admin_id
  FROM super_admin
  WHERE email = p_email
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Super admin with email % not found', p_email;
  END IF;

  -- Check if already linked
  IF EXISTS (SELECT 1 FROM super_admin WHERE auth_id = p_auth_id) THEN
    RAISE EXCEPTION 'Auth ID is already linked to a super admin';
  END IF;

  UPDATE super_admin
  SET auth_id = p_auth_id,
      updated_at = now()
  WHERE id = v_super_admin_id;

  RETURN v_super_admin_id;
END;
$$;

-- 7. Create activity logging function
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

-- 8. Create role exclusivity trigger
CREATE OR REPLACE FUNCTION prevent_staff_super_admin_overlap()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.auth_id != OLD.auth_id THEN
    IF EXISTS (SELECT 1 FROM staff WHERE auth_id = NEW.auth_id) THEN
      RAISE EXCEPTION 'User is already a staff member';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_super_admin_overlap ON super_admin;
CREATE TRIGGER check_super_admin_overlap
  BEFORE INSERT OR UPDATE ON super_admin
  FOR EACH ROW
  EXECUTE FUNCTION prevent_staff_super_admin_overlap();

-- 9. Add RLS policies
ALTER TABLE public.super_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view all super admin records" ON public.super_admin;
CREATE POLICY "Super admins can view all super admin records"
ON public.super_admin FOR SELECT
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all activity logs" ON public.super_admin_activity;
CREATE POLICY "Super admins can view all activity logs"
ON public.super_admin_activity FOR SELECT
USING (is_super_admin(auth.uid()));

-- 10. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.super_admin TO authenticated;
GRANT ALL ON public.super_admin_activity TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION link_super_admin_with_auth TO authenticated;
GRANT EXECUTE ON FUNCTION log_super_admin_activity TO authenticated;

-- 11. Initialize first super admin (if not exists)
SELECT ensure_super_admin('admin@ak.com', 'System Administrator');