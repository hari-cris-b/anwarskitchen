-- Update the initial super admin setup function to handle the first super admin differently
CREATE OR REPLACE FUNCTION setup_initial_super_admin(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Only allow if no super admins exist
  IF EXISTS (SELECT 1 FROM super_admin) THEN
    RAISE EXCEPTION 'Super admin already exists';
  END IF;

  -- Create auth user
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at, -- Auto confirm email for initial super admin
    raw_user_meta_data
  )
  VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(), -- Confirm email immediately
    jsonb_build_object(
      'is_super_admin', true,
      'full_name', p_full_name
    )
  )
  RETURNING id INTO v_user_id;

  -- Create super admin record
  INSERT INTO super_admin (auth_id, email, full_name)
  VALUES (v_user_id, p_email, p_full_name);

  -- Create a trigger to check email for subsequent super admin creations
  EXECUTE $trigger$
  CREATE OR REPLACE FUNCTION check_super_admin_email()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $func$
  BEGIN
    IF (SELECT COUNT(*) FROM super_admin) > 1 THEN
      -- After initial setup, require email pre-registration
      IF NOT EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE email = NEW.email 
        AND raw_user_meta_data->>'is_super_admin' = 'true'
      ) THEN
        RAISE EXCEPTION 'Email not pre-registered for super admin';
      END IF;
    END IF;
    RETURN NEW;
  END;
  $func$;
  $trigger$;

  -- Create the trigger
  EXECUTE $trigger$
  DROP TRIGGER IF EXISTS check_super_admin_email ON super_admin;
  CREATE TRIGGER check_super_admin_email
    BEFORE INSERT ON super_admin
    FOR EACH ROW
    EXECUTE FUNCTION check_super_admin_email();
  $trigger$;
END;
$$;

-- Update the RLS policies for super_admin table
DROP POLICY IF EXISTS "Super admins can read themselves" ON super_admin;
DROP POLICY IF EXISTS "Anyone can check if super admin exists" ON super_admin;

-- Allow reading super admin info
CREATE POLICY "Super admins can read themselves"
ON super_admin FOR SELECT
USING (auth.uid() = auth_id);

-- Allow initial super admin creation
CREATE POLICY "Allow initial super admin creation"
ON super_admin FOR INSERT
WITH CHECK (
  NOT EXISTS (SELECT 1 FROM super_admin)
  OR 
  (EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.uid() = id 
    AND raw_user_meta_data->>'is_super_admin' = 'true'
  ))
);

-- Allow super admins to update their own info
CREATE POLICY "Super admins can update themselves"
ON super_admin FOR UPDATE
USING (auth.uid() = auth_id)
WITH CHECK (auth.uid() = auth_id);

-- Create helper function to check super admin count safely
CREATE OR REPLACE FUNCTION get_super_admin_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT COUNT(*)::integer FROM super_admin);
END;
$$;

-- Revoke direct table access
REVOKE ALL ON super_admin FROM PUBLIC;

-- Grant specific access through RLS
GRANT SELECT, INSERT, UPDATE ON super_admin TO authenticated;