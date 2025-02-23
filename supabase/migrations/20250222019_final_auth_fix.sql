-- Apply all changes in a single transaction
BEGIN;

-- Disable RLS and triggers temporarily
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.users DISABLE TRIGGER ALL;

-- Reset permissions
REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA auth FROM anon, authenticated;

-- Set proper permissions
GRANT USAGE ON SCHEMA auth TO service_role, anon, authenticated;
GRANT ALL ON auth.users TO service_role;
GRANT SELECT, INSERT ON auth.users TO anon;
GRANT SELECT ON auth.users TO authenticated;

-- Reset auth user table constraints
ALTER TABLE auth.users 
  DROP CONSTRAINT IF EXISTS users_email_key,
  DROP CONSTRAINT IF EXISTS users_phone_key,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN last_sign_in_at DROP NOT NULL,
  ALTER COLUMN raw_app_meta_data SET DEFAULT '{}'::jsonb,
  ALTER COLUMN raw_user_meta_data SET DEFAULT '{}'::jsonb,
  ADD CONSTRAINT users_email_key UNIQUE (email);

-- Create function to check registration eligibility
CREATE OR REPLACE FUNCTION auth.is_registration_allowed()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    CASE
      WHEN NULLIF(current_setting('request.jwt.claim.role', TRUE), '')::text = 'service_role' THEN
        true
      WHEN current_setting('role', TRUE)::text = 'service_role' THEN
        true
      ELSE
        EXISTS (
          SELECT 1 
          FROM public.staff 
          WHERE email = current_setting('request.jwt.claim.email', TRUE)::text
          AND auth_id IS NULL 
          AND email_verified = true
        )
    END;
$$;

-- Create simplified registration policy
DROP POLICY IF EXISTS "auth_signup_policy" ON auth.users;
CREATE POLICY "auth_signup_policy"
ON auth.users
FOR INSERT
WITH CHECK (
  auth.is_registration_allowed()
);

-- Create policy for reading own record
DROP POLICY IF EXISTS "auth_read_policy" ON auth.users;
CREATE POLICY "auth_read_policy"
ON auth.users
FOR SELECT
USING (
  auth.uid() = id OR
  NULLIF(current_setting('request.jwt.claim.role', TRUE), '')::text = 'service_role'
);

-- Create minimal update trigger
CREATE OR REPLACE FUNCTION auth.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.handle_updated_at();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION auth.is_registration_allowed() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.handle_updated_at() TO service_role;

-- Enable RLS and only necessary triggers
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_updated;

-- Add helpful comments
COMMENT ON FUNCTION auth.is_registration_allowed IS 'Checks if current request can create auth account';
COMMENT ON POLICY "auth_signup_policy" ON auth.users IS 'Controls user registration based on staff verification';
COMMENT ON POLICY "auth_read_policy" ON auth.users IS 'Users can only read their own auth records';

COMMIT;
