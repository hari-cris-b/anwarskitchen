-- Begin transaction
BEGIN;

-- Basic grants for auth schema
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Reset all permissions first
REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM anon, authenticated;

-- Core table permissions for auth
GRANT INSERT, SELECT ON auth.users TO anon;
GRANT INSERT, SELECT ON auth.identities TO anon;
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.identities TO authenticated;

-- User metadata table permissions
CREATE TABLE IF NOT EXISTS auth.users_metadata (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    metadata jsonb
);

GRANT INSERT, SELECT ON auth.users_metadata TO anon;
GRANT SELECT ON auth.users_metadata TO authenticated;

-- Let service role bypass RLS and have full access
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO service_role;

-- Ensure auth.users has RLS disabled for service role to work
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Simple registration policy that we know works
DROP POLICY IF EXISTS "Allow public registration" ON auth.users;
CREATE POLICY "Allow public registration" 
    ON auth.users 
    FOR INSERT 
    WITH CHECK (true);

-- Ensure auth.identities has proper RLS setup
ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow identity creation" ON auth.identities;
CREATE POLICY "Allow identity creation"
    ON auth.identities
    FOR INSERT
    WITH CHECK (true);

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO anon, authenticated;

-- Create helpful indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users(email);
CREATE INDEX IF NOT EXISTS users_instance_id_idx ON auth.users(instance_id);
CREATE INDEX IF NOT EXISTS identities_user_id_idx ON auth.identities(user_id);

-- Add comment for clarity
COMMENT ON POLICY "Allow public registration" ON auth.users IS 'Enable public registration while service role handles verification';

COMMIT;
