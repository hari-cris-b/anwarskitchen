-- Begin transaction
BEGIN;

-- Drop functions that were incorrectly added
DROP FUNCTION IF EXISTS is_super_admin_role() CASCADE;
DROP FUNCTION IF EXISTS check_staff_franchise_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS create_test_super_admin(text, text) CASCADE;

-- Restore original staff table structure
ALTER TABLE staff 
  ALTER COLUMN staff_type TYPE text,  -- Convert back to text until proper ENUM setup
  DROP CONSTRAINT IF EXISTS valid_staff_type;

-- Remove super_admin from staff type options
UPDATE staff 
SET staff_type = 'admin' 
WHERE staff_type = 'super_admin';

-- Recreate proper staff_role type without super_admin
DROP TYPE IF EXISTS staff_role CASCADE;
CREATE TYPE staff_role AS ENUM ('admin', 'manager', 'kitchen', 'staff');

-- Update staff table to use proper enum
ALTER TABLE staff 
  ALTER COLUMN staff_type TYPE staff_role 
  USING (
    CASE staff_type
      WHEN 'admin' THEN 'admin'::staff_role
      WHEN 'manager' THEN 'manager'::staff_role
      WHEN 'kitchen' THEN 'kitchen'::staff_role
      ELSE 'staff'::staff_role
    END
  );

-- Restore super admin specific functions
CREATE OR REPLACE FUNCTION check_super_admin(check_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM super_admin
    WHERE auth_id = check_auth_id
  );
END;
$$;

-- Ensure proper super admin policies
DROP POLICY IF EXISTS "Super admins can access all franchises" ON franchises;
CREATE POLICY "Super admins can access all franchises" ON franchises
    FOR ALL
    USING (check_super_admin(auth.uid()));

-- Add comment
COMMENT ON FUNCTION check_super_admin IS 'Checks if the current user is a super admin';

-- Recreate staff_email_status view without super_admin references
DROP VIEW IF EXISTS staff_email_status CASCADE;
CREATE VIEW staff_email_status AS
SELECT
    s.id,
    s.email,
    s.full_name,
    s.staff_type::text as staff_type,
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

-- Add helpful message
DO $$
BEGIN
  RAISE NOTICE 'Super admin functionality has been restored to use dedicated super_admin table';
END $$;

COMMIT;