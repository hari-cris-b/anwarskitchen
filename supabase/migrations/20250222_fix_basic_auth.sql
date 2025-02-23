-- Begin transaction
BEGIN;

-- Ensure auth schema exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Basic grants for auth schema
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Reset permissions
REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM anon, authenticated;

-- Core permissions for auth.users
GRANT INSERT ON auth.users TO anon;
GRANT SELECT ON auth.users TO anon, authenticated;

-- Ensure service role has all permissions
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO service_role;

-- Remove RLS from auth.users to allow service role operations
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Simple registration policy
DROP POLICY IF EXISTS "Allow public registration" ON auth.users;
CREATE POLICY "Allow public registration" 
    ON auth.users 
    FOR INSERT 
    WITH CHECK (
        -- Simple check first to test basic auth functionality
        true
    );

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO anon;

-- Enable RLS on auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Test query to verify staff table access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM public.staff 
        LIMIT 1
    ) THEN
        RAISE NOTICE 'No staff records found - verify staff table exists and is accessible';
    END IF;
END $$;

COMMIT;
