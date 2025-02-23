BEGIN;

-- Disable RLS temporarily
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.users DISABLE TRIGGER ALL;

-- Drop our new objects
DROP VIEW IF EXISTS auth.auth_debug;
DROP FUNCTION IF EXISTS auth.bypass_rls();
DROP POLICY IF EXISTS "unified_auth_policy" ON auth.users;

-- Remove auth API role permissions
REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM supabase_auth_api;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA auth FROM supabase_auth_api;
REVOKE ALL ON ALL ROUTINES IN SCHEMA auth FROM supabase_auth_api;
REVOKE ALL ON SCHEMA auth FROM supabase_auth_api;

-- Restore base permissions
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT, INSERT ON auth.users TO anon;

-- Restore original policies
CREATE POLICY "Allow public access to auth.users"
ON auth.users
FOR SELECT
USING (true);

CREATE POLICY "Allow individual update access"
ON auth.users
FOR UPDATE
USING (auth.uid() = id);

-- Re-enable RLS and triggers
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.users ENABLE TRIGGER ALL;

COMMIT;
