-- Begin transaction
BEGIN;

-- Add any missing columns to auth.users
DO $$
BEGIN
  -- instance_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'instance_id') THEN
    ALTER TABLE auth.users ADD COLUMN instance_id uuid;
  END IF;

  -- raw_user_meta_data column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'raw_user_meta_data') THEN
    ALTER TABLE auth.users ADD COLUMN raw_user_meta_data jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- raw_app_meta_data column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'raw_app_meta_data') THEN
    ALTER TABLE auth.users ADD COLUMN raw_app_meta_data jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Ensure timestamp columns have defaults
  ALTER TABLE auth.users 
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();
END $$;

-- Ensure service_role has complete access
GRANT ALL ON SCHEMA auth TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO service_role;

-- Grant anon role permissions for signup
GRANT USAGE ON SCHEMA auth TO anon;
GRANT ALL ON auth.users TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO anon;

-- Disable RLS on auth.users
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Clear any existing problematic data
DELETE FROM auth.users WHERE raw_app_meta_data IS NULL OR raw_user_meta_data IS NULL;

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users(email);
CREATE INDEX IF NOT EXISTS users_meta_app_idx ON auth.users USING gin (raw_app_meta_data);
CREATE INDEX IF NOT EXISTS users_meta_user_idx ON auth.users USING gin (raw_user_meta_data);

COMMIT;
