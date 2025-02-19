-- Create super_admin table
CREATE TABLE IF NOT EXISTS super_admin (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  CONSTRAINT super_admin_email_check CHECK (email ~* '^.+@.+\..+$')
);

-- Add RLS policies for super_admin table
ALTER TABLE super_admin ENABLE ROW LEVEL SECURITY;

-- Only allow super admins to read super_admin table
CREATE POLICY "Super admins can read super_admin"
  ON super_admin
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_id 
      FROM super_admin 
      WHERE auth_id IS NOT NULL
    )
  );

-- Remove super_admin from staff types
ALTER TABLE staff 
  DROP CONSTRAINT IF EXISTS staff_type_check;

ALTER TABLE staff
  ADD CONSTRAINT staff_type_check 
  CHECK (staff_type IN ('admin', 'manager', 'kitchen', 'staff'));

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM super_admin
    WHERE auth_id = user_id
  );
END;
$$;

-- Create function to validate super admin access
CREATE OR REPLACE FUNCTION validate_super_admin_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Requires super admin privileges';
  END IF;
  RETURN NEW;
END;
$$;

-- Add trigger for franchise table modifications
DROP TRIGGER IF EXISTS ensure_super_admin_franchise ON franchises;
CREATE TRIGGER ensure_super_admin_franchise
  BEFORE INSERT OR UPDATE OR DELETE ON franchises
  FOR EACH ROW
  EXECUTE FUNCTION validate_super_admin_access();

-- Create function to handle super admin registration
CREATE OR REPLACE FUNCTION handle_super_admin_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure email domains for super admins (customize as needed)
  IF NEW.email NOT LIKE '%@yourdomain.com' THEN
    RAISE EXCEPTION 'Invalid email domain for super admin';
  END IF;

  INSERT INTO super_admin (auth_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  RETURN NEW;
END;
$$;

-- Add trigger for super admin registration
DROP TRIGGER IF EXISTS on_super_admin_signup ON auth.users;
CREATE TRIGGER on_super_admin_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.raw_user_meta_data->>'is_super_admin' = 'true')
  EXECUTE FUNCTION handle_super_admin_registration();

-- Initial setup function for first super admin
CREATE OR REPLACE FUNCTION setup_initial_super_admin(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Only allow if no super admins exist
  IF EXISTS (SELECT 1 FROM super_admin) THEN
    RAISE EXCEPTION 'Super admin already exists';
  END IF;

  -- Create auth user
  INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
  VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    jsonb_build_object(
      'is_super_admin', true,
      'full_name', p_full_name
    )
  )
  RETURNING id INTO v_user_id;

  -- Create super admin record
  INSERT INTO super_admin (auth_id, email, full_name)
  VALUES (v_user_id, p_email, p_full_name);
END;
$$;