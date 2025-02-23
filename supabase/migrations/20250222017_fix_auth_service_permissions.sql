BEGIN;

-- Drop all policies first
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'auth' 
    AND tablename = 'users'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON auth.users', pol.policyname);
  END LOOP;
END
$$;

-- Disable RLS temporarily
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Reset ALL permissions
REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA auth FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA auth FROM PUBLIC, anon, authenticated;
REVOKE USAGE ON SCHEMA auth FROM PUBLIC, anon, authenticated;

-- Grant base permissions
GRANT USAGE ON SCHEMA auth TO service_role, postgres, anon, authenticated;

-- Service role needs full access for auth operations
GRANT ALL ON auth.users TO service_role;
GRANT ALL ON auth.identities TO service_role;
GRANT ALL ON auth.sessions TO service_role;
GRANT ALL ON auth.refresh_tokens TO service_role;

-- Auth admin needs full access
GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO supabase_auth_admin;

-- Anon needs to create accounts
GRANT INSERT ON auth.users TO anon;
GRANT INSERT ON auth.identities TO anon;

-- Authenticated users need to read their own data
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.identities TO authenticated;

-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Simplified policy for user creation
CREATE POLICY "auth_user_registration"
ON auth.users
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Allow service role to bypass checks
  (NULLIF(current_setting('request.jwt.claim.role', TRUE), '')::text = 'service_role') OR
  (
    id IS NOT NULL AND
    email IS NOT NULL AND
    -- Use simpler check without subquery
    email IN (
      SELECT s.email 
      FROM staff s 
      WHERE s.email = auth.users.email 
      AND s.auth_id IS NULL 
      AND s.email_verified = true
    )
  )
);

-- Policy for reading own records
CREATE POLICY "auth_user_self_read"
ON auth.users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR
  NULLIF(current_setting('request.jwt.claim.role', TRUE), '')::text = 'service_role'
);

-- Ensure auth functions are security definer
ALTER FUNCTION auth.check_user_creation(text) SECURITY DEFINER;
ALTER FUNCTION auth.set_updated_at() SECURITY DEFINER;

-- Grant function execute permissions
GRANT EXECUTE ON FUNCTION auth.check_user_creation(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_staff_registration(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_staff_account(text, uuid) TO authenticated;

-- Add helpful comments
COMMENT ON POLICY "auth_user_registration" ON auth.users IS 'Allows new user registration for verified staff';
COMMENT ON POLICY "auth_user_self_read" ON auth.users IS 'Users can read their own records';

COMMIT;
