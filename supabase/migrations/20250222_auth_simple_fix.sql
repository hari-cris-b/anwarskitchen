-- Begin transaction
BEGIN;

-- Core permissions for auth signup
GRANT USAGE ON SCHEMA auth TO anon;
GRANT SELECT, INSERT ON auth.users TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO anon;

-- Remove RLS completely from auth.users
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Clear any existing RLS policies
DROP POLICY IF EXISTS "Allow public registration" ON auth.users;

-- Simple index for staff verification
DROP INDEX IF EXISTS idx_staff_email_signup;
CREATE INDEX idx_staff_email_signup ON public.staff(email) 
WHERE email_verified = true AND auth_id IS NULL;

-- Staff table permissions
GRANT SELECT ON public.staff TO anon;
GRANT UPDATE (auth_id) ON public.staff TO authenticated;

COMMIT;
