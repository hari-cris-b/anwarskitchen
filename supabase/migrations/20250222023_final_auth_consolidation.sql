BEGIN;

-- First disable RLS
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Reset all permissions
REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA auth FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA auth FROM PUBLIC, anon, authenticated;
REVOKE USAGE ON SCHEMA auth FROM PUBLIC, anon, authenticated;

-- Set up auth API role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_api') THEN
    CREATE ROLE supabase_auth_api NOINHERIT;
  END IF;
END
$$;

-- Grant role hierarchy permissions
GRANT supabase_auth_api TO postgres;
GRANT ALL ON SCHEMA auth TO supabase_auth_api;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_api;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_api;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO supabase_auth_api;

-- Grant admin permissions
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;

-- Grant service role permissions
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT SELECT, INSERT, UPDATE ON auth.users TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth TO service_role;

-- Grant authenticated user permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Grant anonymous permissions for signup
GRANT USAGE ON SCHEMA auth TO anon;
GRANT INSERT ON auth.users TO anon;
GRANT INSERT ON auth.identities TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth TO anon;

-- Create RLS bypass function
CREATE OR REPLACE FUNCTION auth.bypass_rls()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE WHEN 
      current_setting('role', TRUE)::text = ANY(ARRAY['supabase_auth_api', 'supabase_auth_admin', 'service_role'])
      OR NULLIF(current_setting('request.jwt.claim.role', TRUE), '')::text = 'service_role'
    THEN true
    ELSE false
    END;
$$;

-- Grant execute on bypass function
GRANT EXECUTE ON FUNCTION auth.bypass_rls() TO anon, authenticated, service_role;

-- Clean up existing policies without touching system triggers
DO $$
DECLARE
    pol text;
BEGIN
    FOR pol IN (
        SELECT policyname::text
        FROM pg_policies 
        WHERE schemaname = 'auth' 
        AND tablename = 'users'
        AND policyname NOT LIKE 'RI_%'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON auth.users', pol);
    END LOOP;
END;
$$;

-- Create the unified auth policy
CREATE POLICY "unified_auth_policy" ON auth.users
AS PERMISSIVE
FOR ALL
USING (
  (
    -- Allow auth service and admin bypass
    auth.bypass_rls()
  ) OR (
    CASE current_setting('request.path', TRUE)
      -- Allow signups for verified staff
      WHEN '/auth/v1/signup' THEN
        email IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM staff 
          WHERE staff.email = auth.users.email
          AND staff.auth_id IS NULL 
          AND staff.email_verified = true
        )
      -- Allow users to access their own records
      WHEN '/auth/v1/user' THEN
        auth.uid() = id
      -- Deny by default  
      ELSE false
    END
  )
);

-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create debug view
CREATE OR REPLACE VIEW auth.auth_debug AS
SELECT 
  current_setting('role', TRUE) as current_role,
  NULLIF(current_setting('request.jwt.claim.role', TRUE), '') as jwt_role,
  current_setting('request.path', TRUE) as request_path,
  auth.bypass_rls() as can_bypass_rls;

-- Add helpful comments
COMMENT ON POLICY "unified_auth_policy" ON auth.users IS 'Single unified policy for auth management';
COMMENT ON FUNCTION auth.bypass_rls() IS 'Checks if role should bypass RLS';
COMMENT ON VIEW auth.auth_debug IS 'Debug view for auth configuration';

COMMIT;
