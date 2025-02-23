-- Begin transaction
BEGIN;

-- First drop and recreate the view
DROP VIEW IF EXISTS staff_email_status;

CREATE VIEW staff_email_status AS
SELECT
  s.id,
  s.email,
  s.full_name,
  s.staff_type,
  s.franchise_id,
  s.email_verified,
  s.status,
  s.auth_id IS NOT NULL as has_auth_id,
  CASE 
    WHEN s.auth_id IS NOT NULL THEN true
    WHEN s.email_verified THEN true
    ELSE false
  END as is_verified
FROM staff s;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Allow public signup access" ON staff;

-- Create policies for signup access
CREATE POLICY "Allow public signup access" ON staff
    FOR SELECT
    USING (
        -- Allow access during email verification and signup
        auth.role() = 'anon' OR
        -- Allow authenticated users to access their own records
        auth.uid() = auth_id OR
        -- Allow staff managers to access franchise staff
        EXISTS (
            SELECT 1 
            FROM staff s 
            WHERE s.auth_id = auth.uid() 
            AND s.franchise_id = staff.franchise_id 
            AND s.can_manage_staff = true
        )
    );

-- Policy to allow updating auth_id during signup
CREATE POLICY "Allow auth_id update during signup" ON staff
    FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND
        auth_id IS NULL AND
        email_verified = true
    )
    WITH CHECK (
        -- Only allow setting auth_id to the current user's ID
        auth.uid() = auth_id
    );

-- Grant necessary permissions
GRANT SELECT ON staff_email_status TO anon;
GRANT UPDATE (auth_id) ON staff TO authenticated;

-- Re-grant execute permission on check_staff_email function
GRANT EXECUTE ON FUNCTION check_staff_email(text) TO anon;

-- Add comment for documentation
COMMENT ON POLICY "Allow public signup access" ON staff IS 'Allows public access for email verification during signup';

COMMIT;
