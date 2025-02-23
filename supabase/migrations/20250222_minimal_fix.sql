-- Begin transaction
BEGIN;

-- Grant minimal required permissions for signup
GRANT USAGE ON SCHEMA auth TO anon;
GRANT SELECT, INSERT ON auth.users TO anon;
GRANT SELECT ON auth.users TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO anon;

-- Ensure identities table can be modified during signup
GRANT INSERT ON auth.identities TO anon;

-- Remove RLS from auth.users
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Create staff index for faster lookups during signup
CREATE INDEX IF NOT EXISTS idx_staff_signup ON public.staff(email, email_verified, auth_id)
WHERE email_verified = true AND auth_id IS NULL;

-- Grant access to check staff status
GRANT SELECT ON public.staff TO anon;
GRANT EXECUTE ON FUNCTION check_staff_email TO anon;

COMMIT;
