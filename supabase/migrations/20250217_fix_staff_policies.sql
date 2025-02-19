-- Drop existing problematic policies
DROP POLICY IF EXISTS "Staff members can view their franchise staff" ON staff;
DROP POLICY IF EXISTS "Admins can manage staff" ON staff;
DROP POLICY IF EXISTS "Staff can view own franchise staff" ON staff;
DROP POLICY IF EXISTS "Super admins can view all staff" ON staff;

-- Create simplified non-recursive policies for staff table
CREATE POLICY "View own profile"
ON staff
FOR SELECT
USING (
  -- Staff can view their own profile
  auth.uid() = auth_id
);

CREATE POLICY "Admin manage franchise staff"
ON staff
FOR ALL
USING (
  -- Admins can manage staff in their franchise
  EXISTS (
    SELECT 1 
    FROM staff s 
    WHERE s.auth_id = auth.uid() 
    AND s.franchise_id = staff.franchise_id 
    AND s.staff_type = 'admin'
  )
);

CREATE POLICY "Super admin full access"
ON staff
FOR ALL
USING (
  -- Super admins can access all staff records
  EXISTS (
    SELECT 1 
    FROM super_admin sa 
    WHERE sa.auth_id = auth.uid()
  )
);

-- Create helper function to check staff access without recursion
CREATE OR REPLACE FUNCTION check_staff_access(p_auth_id UUID)
RETURNS TABLE (franchise_id UUID, staff_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First check if user is super admin
  IF EXISTS (SELECT 1 FROM super_admin WHERE auth_id = p_auth_id) THEN
    RETURN QUERY
      SELECT DISTINCT s.franchise_id, 'super_admin'::text
      FROM staff s;
    RETURN;
  END IF;

  -- Return franchise_id and staff_type for regular staff
  RETURN QUERY
    SELECT s.franchise_id, s.staff_type::text
    FROM staff s
    WHERE s.auth_id = p_auth_id;
END;
$$;

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_staff_auth_id_type ON staff(auth_id, staff_type);
CREATE INDEX IF NOT EXISTS idx_staff_franchise_type ON staff(franchise_id, staff_type);

-- Fix staff type enum if needed
DO $$
BEGIN
  -- Update staff_role type if it exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
    ALTER TYPE staff_role RENAME TO staff_role_old;
    CREATE TYPE staff_role AS ENUM ('admin', 'manager', 'kitchen', 'staff');
    
    -- Update the staff table to use new enum
    ALTER TABLE staff 
      ALTER COLUMN staff_type TYPE staff_role 
      USING staff_type::text::staff_role;
      
    DROP TYPE staff_role_old;
  END IF;
END$$;

-- Update the staff table constraints
ALTER TABLE staff 
  DROP CONSTRAINT IF EXISTS staff_type_check;

ALTER TABLE staff
  ADD CONSTRAINT staff_type_check 
  CHECK (staff_type IN ('admin', 'manager', 'kitchen', 'staff'));