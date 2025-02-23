-- Begin transaction
BEGIN;

-- Create auth schema if not exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Set proper ownership
ALTER SCHEMA auth OWNER TO supabase_auth_admin;

-- Set schema search path (needed for auth functions)
ALTER DATABASE postgres SET search_path TO "$user",public,extensions,auth;

-- Reset and regrant core permissions
REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA auth FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA auth FROM anon, authenticated;

-- Grant minimal required permissions
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT, INSERT ON auth.users TO anon;
GRANT SELECT ON auth.users TO authenticated;

-- Ensure auth.users has proper defaults
ALTER TABLE auth.users
    ALTER COLUMN raw_app_meta_data SET DEFAULT '{}'::jsonb,
    ALTER COLUMN raw_user_meta_data SET DEFAULT '{}'::jsonb,
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();

-- Give full access to service role
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO service_role;

-- Disable RLS on auth.users
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

COMMIT;
