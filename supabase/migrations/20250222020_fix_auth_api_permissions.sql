BEGIN;

-- Reset ALL permissions first
REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA auth FROM anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA auth FROM anon, authenticated, service_role;
REVOKE USAGE ON SCHEMA auth FROM anon, authenticated, service_role;

-- Grant schema access
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;

-- Grant service role full access
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA auth TO service_role;

-- Grant admin role full access
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA auth TO supabase_auth_admin;

-- Grant specific permissions to anon for signup
GRANT INSERT ON TABLE auth.users TO anon;
GRANT INSERT ON TABLE auth.identities TO anon;
GRANT USAGE ON SEQUENCE auth.users_id_seq TO anon;
GRANT USAGE ON SEQUENCE auth.identities_id_seq TO anon;

-- Grant specific permissions to authenticated users
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.identities TO authenticated;

-- Ensure RLS is enabled but service role can bypass
ALTER TABLE auth.users FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Update existing policies to respect service role
DROP POLICY IF EXISTS "auth_signup_policy" ON auth.users;
CREATE POLICY "auth_signup_policy"
ON auth.users
FOR INSERT
WITH CHECK (
  -- Either service role
  current_setting('role', TRUE)::text = 'service_role'
  OR NULLIF(current_setting('request.jwt.claim.role', TRUE), '')::text = 'service_role'
  OR (
    -- Or valid staff registration
    email IS NOT NULL
    AND id IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM staff 
      WHERE staff.email = auth.users.email
      AND staff.auth_id IS NULL 
      AND staff.email_verified = true
    )
  )
);

-- Ensure service role can execute all auth functions
DO $$
DECLARE
    _function record;
BEGIN
    FOR _function IN 
        SELECT p.proname, p.pronamespace::regnamespace as schema
        FROM pg_proc p
        WHERE p.pronamespace::regnamespace::text = 'auth'
    LOOP
        EXECUTE format(
            'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
            _function.schema,
            _function.proname,
            (SELECT coalesce(string_agg(pt.typname, ', '), '')
             FROM pg_proc p2
             LEFT JOIN unnest(p2.proargtypes) WITH ORDINALITY AS pt(oid, ord) ON TRUE
             LEFT JOIN pg_type t ON pt.oid = t.oid
             WHERE p2.oid = _function.proname::regproc::oid
             GROUP BY p2.oid)
        );
    END LOOP;
END;
$$;

-- Add comments
COMMENT ON SCHEMA auth IS 'Auth schema with proper service role access';
COMMENT ON POLICY "auth_signup_policy" ON auth.users IS 'Allow signup for verified staff and service role';

COMMIT;
