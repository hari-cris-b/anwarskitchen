-- Drop existing function
DROP FUNCTION IF EXISTS public.check_staff_email(text);

-- Create the email check function
CREATE FUNCTION public.check_staff_email(p_email text)
RETURNS TABLE (
  email_exists boolean,
  is_verified boolean,
  has_auth_id boolean
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS(SELECT 1 FROM staff WHERE email = p_email) as email_exists,
    COALESCE((
      SELECT email_verified
      FROM staff
      WHERE email = p_email
      LIMIT 1
    ), false) as is_verified,
    COALESCE((
      SELECT (auth_id IS NOT NULL)
      FROM staff
      WHERE email = p_email
      LIMIT 1
    ), false) as has_auth_id;
$$;

-- Reset ownership to postgres
ALTER FUNCTION public.check_staff_email(text) OWNER TO postgres;

-- Grant execute to anon role
GRANT EXECUTE ON FUNCTION public.check_staff_email(text) TO anon;

-- Drop and recreate view
DROP VIEW IF EXISTS staff_email_status;

-- Create view for email checks
CREATE VIEW staff_email_status AS
SELECT
    id,
    email,
    email_verified,
    (auth_id IS NOT NULL) as has_auth,
    franchise_id,
    staff_type,
    permissions,
    full_name
FROM staff;

-- Grant permissions
GRANT SELECT ON staff_email_status TO anon;

-- Add comment
COMMENT ON FUNCTION check_staff_email IS 'Check if a staff email exists and its verification status';
