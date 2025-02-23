-- Begin transaction
BEGIN;

-- Create type if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aal_level') THEN
        CREATE TYPE aal_level AS ENUM ('aal1', 'aal2', 'aal3');
    END IF;
END $$;

-- Create auth schema if not exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Create core auth tables
CREATE TABLE IF NOT EXISTS auth.users (
    instance_id uuid,
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE,
    encrypted_password text,
    email_confirmed_at timestamptz,
    raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    phone text UNIQUE,
    confirmed_at timestamptz,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamptz,
    reauthentication_token text,
    is_sso_user boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS auth.identities (
    id text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT identities_pkey PRIMARY KEY (provider, id)
);

-- Reset permissions
REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM anon, authenticated;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

GRANT INSERT, SELECT ON auth.users TO anon;
GRANT INSERT, SELECT ON auth.identities TO anon;
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.identities TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users(email);
CREATE INDEX IF NOT EXISTS users_instance_id_idx ON auth.users(instance_id);
CREATE INDEX IF NOT EXISTS identities_user_id_idx ON auth.identities(user_id);

-- Remove RLS completely from auth.users 
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Grant sequence access
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO anon, authenticated;

-- Add permission for managing identities
GRANT INSERT, DELETE ON auth.identities TO anon;

COMMIT;
