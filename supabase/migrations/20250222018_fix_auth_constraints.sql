BEGIN;

-- First reset any triggers that might interfere
ALTER TABLE auth.users DISABLE TRIGGER ALL;
ALTER TABLE auth.identities DISABLE TRIGGER ALL;

-- Drop and recreate auth user constraints to ensure proper order
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS users_phone_key;

-- Set proper constraints that work with our flow
ALTER TABLE auth.users 
  ADD CONSTRAINT users_email_key UNIQUE (email),
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN last_sign_in_at DROP NOT NULL,
  ALTER COLUMN raw_app_meta_data SET DEFAULT '{}'::jsonb,
  ALTER COLUMN raw_user_meta_data SET DEFAULT '{}'::jsonb;

-- Create necessary indices
CREATE INDEX IF NOT EXISTS users_email_partial_key 
ON auth.users (email) 
WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_instance_id_email_idx 
ON auth.users (email);

-- Make auth.identities more flexible
ALTER TABLE auth.identities 
  DROP CONSTRAINT IF EXISTS identities_user_id_fkey,
  ADD CONSTRAINT identities_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- Re-enable only necessary triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE OR REPLACE FUNCTION auth.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_updated
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.handle_user_update();

-- Re-enable other triggers
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_updated;
ALTER TABLE auth.identities ENABLE TRIGGER ALL;

-- Update RLS to ensure service role can always access
CREATE OR REPLACE FUNCTION auth.role_is_service()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    NULLIF(current_setting('request.jwt.claim.role', TRUE), '')::text = 'service_role'
    OR NULLIF(current_setting('role', TRUE), '')::text = 'service_role';
$$;

-- Update user registration policy to use this function
DROP POLICY IF EXISTS "auth_user_registration" ON auth.users;
CREATE POLICY "auth_user_registration"
ON auth.users
FOR INSERT
WITH CHECK (
  auth.role_is_service() OR
  (
    id IS NOT NULL AND
    email IS NOT NULL AND
    email IN (
      SELECT email 
      FROM staff 
      WHERE auth_id IS NULL 
      AND email_verified = true
    )
  )
);

-- Grant permissions to the new function
GRANT EXECUTE ON FUNCTION auth.role_is_service() TO anon, authenticated, service_role;

-- Add helpful comments
COMMENT ON FUNCTION auth.role_is_service IS 'Checks if current role is service_role';
COMMENT ON TRIGGER on_auth_user_updated ON auth.users IS 'Updates timestamp when user is modified';

COMMIT;
