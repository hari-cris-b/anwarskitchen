-- Begin transaction
BEGIN;

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
        -- Email must exist in staff table and be verified
        EXISTS (
            SELECT 1 
            FROM public.staff 
            WHERE staff.email = email  -- Using column reference instead of qualified name
            AND staff.email_verified = true
            AND staff.auth_id IS NULL
        )
    );

-- Drop and recreate staff table policies
DROP POLICY IF EXISTS "Allow signup access" ON public.staff;

CREATE POLICY "Allow signup access" ON public.staff
    FOR SELECT
    TO anon, service_role
    USING (
        email_verified = true OR
        auth.role() = 'service_role'
    );

-- Update auth_id update policy
DROP POLICY IF EXISTS "Allow auth_id update" ON public.staff;

CREATE POLICY "Allow auth_id update" ON public.staff
    FOR UPDATE
    TO authenticated, service_role
    USING (
        -- Staff record exists and is verified
        EXISTS (
            SELECT 1 
            FROM public.staff s
            WHERE s.id = staff.id
            AND s.email_verified = true
            AND s.auth_id IS NULL
        )
    )
    WITH CHECK (
        -- Only allow setting auth_id if email matches
        EXISTS (
            SELECT 1 
            FROM auth.users u
            WHERE u.id = auth_id
            AND u.email = staff.email
        )
    );

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_staff_signup_check 
ON public.staff(email, email_verified, auth_id) 
WHERE email_verified = true AND auth_id IS NULL;

-- Re-grant necessary permissions
GRANT SELECT ON auth.users TO anon, authenticated;
GRANT SELECT, UPDATE(auth_id) ON public.staff TO authenticated;
GRANT SELECT ON public.staff TO anon;

COMMIT;
