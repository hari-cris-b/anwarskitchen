-- Begin transaction
BEGIN;

-- Drop view if it exists to avoid errors
DROP VIEW IF EXISTS staff_email_status;

-- Create view for staff email status
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

-- Grant select access to authenticated users and anonymous users (for signup checks)
GRANT SELECT ON staff_email_status TO authenticated, anon;

-- Add comment for documentation
COMMENT ON VIEW staff_email_status IS 'View for checking staff email verification status and account creation eligibility';

COMMIT;