-- Begin transaction
BEGIN;

-- Drop existing policy
DROP POLICY IF EXISTS "Allow auth_id update during signup" ON staff;

-- Create new policy that allows auth_id update during signup
CREATE POLICY "Allow auth_id update during signup" ON staff
    FOR UPDATE
    USING (
        -- Allow update when email is verified and auth_id is null
        auth_id IS NULL AND
        email_verified = true
    )
    WITH CHECK (
        -- Only allow setting auth_id that matches the new auth user
        -- This works because during signUp, the auth.uid() will be the new user's ID
        EXISTS (
            SELECT 1 
            FROM auth.users 
            WHERE id = auth_id 
            AND email = staff.email
            AND created_at > NOW() - INTERVAL '5 minutes'
        )
    );

-- Grant necessary permissions
GRANT SELECT ON auth.users TO anon, authenticated;

COMMIT;
