BEGIN;

-- First disable RLS for cleanup
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Create a special auth_api role for bypassing RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_api'
  ) THEN
    CREATE ROLE supabase_auth_api;
  END IF;
END
$$;

-- Grant necessary permissions to auth API role
GRANT USAGE ON SCHEMA auth TO supabase_auth_api;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_api;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_api;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO supabase_auth_api;

-- Create bypass function
CREATE OR REPLACE FUNCTION auth.bypass_rls()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    CASE WHEN 
      -- Check for service_role OR auth_api role
      current_setting('role', TRUE)::text = ANY(ARRAY['service_role', 'supabase_auth_api', 'supabase_auth_admin'])
      OR NULLIF(current_setting('request.jwt.claim.role', TRUE), '')::text = 'service_role'
    THEN true
    ELSE false
    END;
$$;

-- Revoke and regrant specific permissions
REVOKE ALL ON auth.users FROM anon, authenticated;
GRANT SELECT, INSERT ON auth.users TO anon;
GRANT SELECT ON auth.users TO authenticated;

-- Create final auth policy that respects API service
CREATE OR REPLACE POLICY "enable_auth_api_access"
ON auth.users
AS PERMISSIVE
FOR ALL
USING (
  auth.bypass_rls()
  OR (
    CASE current_setting('request.path', TRUE)
      -- Regular user access
      WHEN '/auth/v1/signup' THEN 
        EXISTS (
          SELECT 1 
          FROM staff 
          WHERE staff.email = auth.users.email
          AND staff.auth_id IS NULL 
          AND staff.email_verified = true
        )
      WHEN '/auth/v1/user' THEN 
        auth.uid() = id
      ELSE false
    END
  )
);

-- Enable RLS but allow auth service to bypass
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Grant execute on bypass function
GRANT EXECUTE ON FUNCTION auth.bypass_rls() TO anon, authenticated, service_role, supabase_auth_api;

-- Add helpful comments
COMMENT ON FUNCTION auth.bypass_rls IS 'Checks if current role should bypass RLS';
COMMENT ON POLICY "enable_auth_api_access" ON auth.users IS 'Allows Supabase Auth API operations while maintaining security';

-- Create verification view for debugging
CREATE OR REPLACE VIEW auth.permission_check AS
SELECT 
  current_setting('role', TRUE) as current_role,
  NULLIF(current_setting('request.jwt.claim.role', TRUE), '') as jwt_role,
  current_setting('request.path', TRUE) as request_path,
  auth.bypass_rls() as can_bypass_rls;

COMMIT;
