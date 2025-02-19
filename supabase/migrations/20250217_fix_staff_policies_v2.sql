-- Drop all existing staff policies to start fresh
DROP POLICY IF EXISTS "View own profile" ON staff;
DROP POLICY IF EXISTS "Admin manage franchise staff" ON staff;
DROP POLICY IF EXISTS "Super admin full access" ON staff;
DROP POLICY IF EXISTS "Staff members can view their franchise staff" ON staff;

-- Create a simple policy for staff read access based on auth_id
CREATE POLICY "Staff can view own record"
ON staff
FOR SELECT
USING (
  auth.uid() = auth_id
);

-- Create a function to check if user is franchise admin
CREATE OR REPLACE FUNCTION is_franchise_admin(looking_at_franchise_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM staff s 
    WHERE s.auth_id = auth.uid()
    AND s.franchise_id = looking_at_franchise_id
    AND s.staff_type = 'admin'
  );
END;
$$;

-- Create a function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = auth.uid()
  );
END;
$$;

-- Create policy for franchise admin to manage staff
CREATE POLICY "Franchise admin can manage staff"
ON staff
FOR ALL
USING (
  is_franchise_admin(franchise_id)
);

-- Create policy for super admin access
CREATE POLICY "Super admin has full access"
ON staff
FOR ALL
USING (
  is_super_admin()
);

-- Create helper function to get user's franchise ID safely
CREATE OR REPLACE FUNCTION get_user_franchise_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_franchise_id UUID;
BEGIN
  -- First try to get franchise_id from staff table
  SELECT franchise_id INTO v_franchise_id
  FROM staff
  WHERE auth_id = auth.uid()
  LIMIT 1;
  
  RETURN v_franchise_id;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_auth_id ON staff(auth_id);
CREATE INDEX IF NOT EXISTS idx_staff_franchise_staff_type ON staff(franchise_id, staff_type);

-- Update RLS to be enabled
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Grant appropriate permissions
GRANT SELECT ON staff TO authenticated;
GRANT INSERT, UPDATE, DELETE ON staff TO authenticated;