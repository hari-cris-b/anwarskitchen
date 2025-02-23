-- Reset all auth related permissions
REVOKE ALL ON auth.users FROM anon, authenticated;
REVOKE ALL ON auth.identities FROM anon, authenticated;

-- Grant specific permissions to auth admin
GRANT ALL ON auth.users TO supabase_auth_admin;
GRANT ALL ON auth.identities TO supabase_auth_admin;

-- Grant limited permissions to service role
GRANT SELECT, INSERT, UPDATE ON auth.users TO service_role;
GRANT SELECT, INSERT ON auth.identities TO service_role;

-- Grant minimal permissions to authenticated users
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.identities TO authenticated;

-- Grant signup permissions to anon
GRANT INSERT ON auth.users TO anon;
GRANT INSERT ON auth.identities TO anon;

-- Ensure auth hook functions have proper permissions
ALTER FUNCTION auth.set_updated_at() SECURITY DEFINER;
ALTER FUNCTION auth.create_new_user(text, uuid, text) SECURITY DEFINER;

-- Ensure service role can execute all auth functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO service_role;

-- Drop and recreate the RLS policies
DROP POLICY IF EXISTS "Allow public access" ON auth.users;
DROP POLICY IF EXISTS "Allow individual read access" ON auth.users;
DROP POLICY IF EXISTS "Allow individual update access" ON auth.users;
DROP POLICY IF EXISTS "Allow new user registration" ON auth.users;

CREATE POLICY "Allow new user registration"
ON auth.users
FOR INSERT
WITH CHECK (
  id IS NOT NULL AND
  email IS NOT NULL AND
  (
    -- Either through service role
    (NULLIF(current_setting('request.jwt.claim.role', TRUE), '')::text = 'service_role') OR
    -- Or verified staff registration
    (SELECT (verify_staff_registration(email)->>'allowed')::boolean)
  )
);

CREATE POLICY "Allow users to read own record"
ON auth.users
FOR SELECT
USING (
  auth.uid() = id OR
  NULLIF(current_setting('request.jwt.claim.role', TRUE), '')::text = 'service_role'
);

-- Add RLS bypass for service role
ALTER TABLE auth.users FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Grant schema usage
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- Add helpful comments
COMMENT ON POLICY "Allow new user registration" ON auth.users IS 'Allows new users to sign up through approved channels';
COMMENT ON POLICY "Allow users to read own record" ON auth.users IS 'Users can only see their own auth records';
