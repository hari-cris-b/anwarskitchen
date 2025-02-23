BEGIN;

-- First, disable RLS and drop all existing policies
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
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

-- Reset all permissions
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

-- Create fresh policies
CREATE POLICY "new_user_registration"
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

CREATE POLICY "read_own_user_record"
ON auth.users
FOR SELECT
USING (
  auth.uid() = id OR
  NULLIF(current_setting('request.jwt.claim.role', TRUE), '')::text = 'service_role'
);

-- Ensure functions have proper permissions
ALTER FUNCTION auth.set_updated_at() SECURITY DEFINER;
ALTER FUNCTION auth.create_new_user(text, uuid, text) SECURITY DEFINER;

-- Grant function execution permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_staff_registration(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_staff_account(TEXT, UUID) TO authenticated;

-- Grant schema usage
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- Enable RLS
ALTER TABLE auth.users FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON POLICY "new_user_registration" ON auth.users IS 'Controls new user registration through approved channels';
COMMENT ON POLICY "read_own_user_record" ON auth.users IS 'Users can only read their own auth records';

COMMIT;
