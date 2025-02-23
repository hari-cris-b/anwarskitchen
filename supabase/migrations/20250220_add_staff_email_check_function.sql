-- Begin transaction
BEGIN;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS check_staff_email(text);

-- Create function to check staff email status
CREATE OR REPLACE FUNCTION check_staff_email(p_email text)
RETURNS TABLE (
    email_exists boolean,
    has_auth_id boolean,
    is_verified boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM staff WHERE email = p_email) as email_exists,
        EXISTS(SELECT 1 FROM staff WHERE email = p_email AND auth_id IS NOT NULL) as has_auth_id,
        COALESCE(
            (SELECT email_verified 
             FROM staff 
             WHERE email = p_email
             LIMIT 1),
            false
        ) as is_verified;
END;
$$;

-- Add RLS policy to allow access to the function
REVOKE ALL ON FUNCTION check_staff_email(text) FROM public;
GRANT EXECUTE ON FUNCTION check_staff_email(text) TO authenticated, anon;

-- Add comment for documentation
COMMENT ON FUNCTION check_staff_email IS 'Checks staff email status for account creation verification';

COMMIT;