-- Begin transaction
BEGIN;

-- Ensure required schemas
CREATE SCHEMA IF NOT EXISTS auth;

-- Grant core permissions
GRANT USAGE ON SCHEMA auth TO anon, authenticated;

-- Clear any conflicting policies
DROP POLICY IF EXISTS "Allow public registration" ON auth.users;
DROP POLICY IF EXISTS "Allow auth updates" ON auth.users;

-- Basic permissions for signup
GRANT SELECT, INSERT ON auth.users TO anon;
GRANT SELECT, INSERT ON auth.identities TO anon;

-- Minimal sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO anon;

-- Remove RLS to let service role work
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Create staff verification index
CREATE INDEX IF NOT EXISTS idx_staff_signup_check 
ON public.staff(email, email_verified, auth_id) 
WHERE email_verified = true AND auth_id IS NULL;

-- Allow anon to check staff status
GRANT SELECT ON public.staff TO anon;
GRANT EXECUTE ON FUNCTION check_staff_email TO anon;

-- Add function to verify staff email
CREATE OR REPLACE FUNCTION public.verify_staff_email(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.staff 
    WHERE email = p_email
    AND email_verified = true 
    AND auth_id IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION verify_staff_email TO anon;

COMMIT;
