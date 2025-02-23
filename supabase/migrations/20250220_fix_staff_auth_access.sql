-- Begin transaction
BEGIN;

-- Drop existing select policy
DROP POLICY IF EXISTS "Allow email verification checks" ON staff;

-- Create a more permissive select policy for staff authentication
CREATE POLICY "Allow staff access during auth" ON staff
    FOR SELECT
    USING (
        -- For initial staff profile load during auth
        auth.uid() IS NOT NULL
        OR
        -- For email verification during signup
        current_setting('request.path', true) LIKE '/rest/v1/rpc/check_staff_email%'
        OR
        -- For fetching staff details during signup
        (current_setting('request.path', true) LIKE '/rest/v1/staff_email_status%' AND 
         email = current_setting('request.jwt.claims', true)::json->>'email')
    );

-- Helper function to check if user has staff access
CREATE OR REPLACE FUNCTION has_staff_access(staff_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM staff s
        WHERE s.auth_id = staff_auth_id
    );
END;
$$;

-- Add helpful comments
COMMENT ON POLICY "Allow staff access during auth" ON staff IS 
'Allows staff members to access their profile during authentication and signup';

COMMENT ON FUNCTION has_staff_access(uuid) IS
'Helper function to check if a user has staff access';

COMMIT;