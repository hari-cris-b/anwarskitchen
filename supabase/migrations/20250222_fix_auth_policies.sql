-- Begin transaction
BEGIN;

-- Ensure auth schema ownership and permissions
ALTER SCHEMA auth OWNER TO authenticator;
GRANT USAGE ON SCHEMA auth TO authenticator, service_role;

-- Grant service_role access to staff table
GRANT ALL ON TABLE public.staff TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Drop and recreate the auth registration policy
DROP POLICY IF EXISTS "Allow public registration" ON auth.users;

CREATE POLICY "Allow public registration"
    ON auth.users
    FOR INSERT
    TO anon
    WITH CHECK (
        -- Simpler policy without using NEW reference
        EXISTS (
            SELECT 1 
            FROM public.staff 
            WHERE staff.email = email 
            AND staff.email_verified = true
            AND staff.auth_id IS NULL
        )
    );

-- Ensure auth service role can bypass RLS
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff FORCE ROW LEVEL SECURITY;

-- Update staff table policies
DROP POLICY IF EXISTS "Service role full access" ON public.staff;
CREATE POLICY "Service role full access" ON public.staff
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Verify permissions
GRANT USAGE ON SCHEMA public TO service_role, anon, authenticated;
GRANT USAGE ON SCHEMA auth TO service_role, anon, authenticated;

-- Update email verification policy to work with auth service
DROP POLICY IF EXISTS "Allow email verification" ON public.staff;
CREATE POLICY "Allow email verification" ON public.staff
    FOR SELECT
    TO anon, service_role
    USING (
        email_verified = true OR
        auth.role() = 'service_role'
    );

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_staff_auth_status 
ON public.staff(email, email_verified, auth_id)
WHERE email_verified = true AND auth_id IS NULL;

COMMIT;
