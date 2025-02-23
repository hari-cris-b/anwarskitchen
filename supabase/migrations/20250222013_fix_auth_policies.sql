-- Drop any existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON auth.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON auth.users;

-- Enable RLS
ALTER TABLE auth.users FORCE ROW LEVEL SECURITY;

-- Create policy for user creation
CREATE POLICY "Allow new user registration"
ON auth.users
FOR INSERT
WITH CHECK (
  id IS NOT NULL AND
  email IS NOT NULL AND
  -- Verify staff eligibility via function
  (SELECT (verify_staff_registration(email)->>'allowed')::boolean)
);

-- Policy for users to read their own records
CREATE POLICY "Allow users to read own record"
ON auth.users
FOR SELECT
USING (auth.uid() = id);

-- Base permissions
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON auth.users TO anon, authenticated;
GRANT INSERT ON auth.users TO anon, authenticated;

-- Service role full access
GRANT ALL ON auth.users TO service_role;

-- Functions for user management
CREATE OR REPLACE FUNCTION auth.check_user_creation(
  p_email TEXT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if email can be used for new account
  RETURN (
    NOT EXISTS (
      SELECT 1 FROM auth.users WHERE email = p_email
    ) AND
    EXISTS (
      SELECT 1 
      FROM staff 
      WHERE email = p_email 
      AND auth_id IS NULL
      AND email_verified = true
    )
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION auth.check_user_creation(TEXT) TO anon, authenticated;

-- Add helpful comments
COMMENT ON POLICY "Allow new user registration" ON auth.users IS 'Only allow creating accounts for verified staff members';
COMMENT ON POLICY "Allow users to read own record" ON auth.users IS 'Users can only read their own auth records';
COMMENT ON FUNCTION auth.check_user_creation IS 'Checks if email is eligible for new auth account';
