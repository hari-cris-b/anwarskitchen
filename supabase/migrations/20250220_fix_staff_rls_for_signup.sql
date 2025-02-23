-- Begin transaction
BEGIN;

-- Drop any existing policies on staff table for email checks
DROP POLICY IF EXISTS "Allow email verification checks" ON staff;
DROP POLICY IF EXISTS "Allow public access to staff email verification status" ON staff;
DROP POLICY IF EXISTS "Allow staff to manage their own record" ON staff;

-- Create policies for staff table
CREATE POLICY "Allow email verification checks" ON staff
    FOR SELECT
    TO public
    USING (
        -- For email verification during signup
        current_setting('request.path', true) LIKE '/rest/v1/rpc/check_staff_email%'
        OR
        -- For fetching staff details during signup
        (current_setting('request.path', true) LIKE '/rest/v1/staff_email_status%' AND 
         email = current_setting('request.jwt.claims', true)::json->>'email')
        OR
        -- Regular staff access
        (auth.uid() = auth_id OR 
         EXISTS (
             SELECT 1 
             FROM staff s 
             WHERE s.auth_id = auth.uid() 
             AND s.franchise_id = staff.franchise_id 
             AND s.can_manage_staff = true
         ))
    );

-- Allow staff to update their own record
CREATE POLICY "Allow staff to manage their own record" ON staff
    FOR UPDATE
    USING (auth.uid() = auth_id)
    WITH CHECK (auth.uid() = auth_id);

-- Allow staff managers to update staff records in their franchise
CREATE POLICY "Allow managers to update staff in franchise" ON staff
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM staff s
            WHERE s.auth_id = auth.uid()
            AND s.franchise_id = staff.franchise_id
            AND s.can_manage_staff = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM staff s
            WHERE s.auth_id = auth.uid()
            AND s.franchise_id = staff.franchise_id
            AND s.can_manage_staff = true
        )
    );

-- Function to handle safe public access to staff email verification
CREATE OR REPLACE FUNCTION get_staff_by_email(p_email text)
RETURNS TABLE (
    id uuid,
    email text,
    email_verified boolean,
    auth_id uuid,
    staff_type text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.email,
        s.email_verified,
        s.auth_id::uuid,
        s.staff_type::text
    FROM staff s
    WHERE s.email = p_email;
END;
$$;

-- Grant execute to public
GRANT EXECUTE ON FUNCTION get_staff_by_email TO public;

-- Add helpful comments
COMMENT ON POLICY "Allow email verification checks" ON staff IS 
'Allows public access to staff email verification status during signup process';

COMMENT ON POLICY "Allow staff to manage their own record" ON staff IS 
'Allows staff members to update their own records';

COMMENT ON POLICY "Allow managers to update staff in franchise" ON staff IS 
'Allows franchise managers to update staff records within their franchise';

COMMIT;