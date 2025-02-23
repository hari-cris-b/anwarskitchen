-- First clean up any existing policies
DROP POLICY IF EXISTS "Allow user registration" ON auth.users;
DROP POLICY IF EXISTS "Allow users to select own record" ON auth.users;

-- Reset RLS
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Ensure auth service role has full access
GRANT ALL ON auth.users TO service_role;
GRANT ALL ON auth.users TO postgres;
GRANT USAGE ON SCHEMA auth TO service_role;

-- Create secure function for user creation verification
CREATE OR REPLACE FUNCTION auth.check_staff_registration(
  reg_email TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM staff 
    WHERE email = reg_email 
    AND auth_id IS NULL
    AND email_verified = true
  );
END;
$$;

-- Grant execute to auth
GRANT EXECUTE ON FUNCTION auth.check_staff_registration TO service_role;

-- Add trigger to validate registration
CREATE OR REPLACE FUNCTION auth.validate_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT auth.check_staff_registration(NEW.email::text) THEN
    RAISE EXCEPTION 'Invalid registration attempt';
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger
DROP TRIGGER IF EXISTS validate_new_user_insert ON auth.users;
CREATE TRIGGER validate_new_user_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.validate_new_user();

-- Add helpful comments
COMMENT ON FUNCTION auth.check_staff_registration IS 'Validates staff registration eligibility';
COMMENT ON FUNCTION auth.validate_new_user IS 'Ensures new users are eligible staff members';
