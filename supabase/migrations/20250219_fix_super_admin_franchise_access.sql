-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can view all franchises" ON franchises;
DROP POLICY IF EXISTS "Super admins can manage franchises" ON franchises;
DROP POLICY IF EXISTS "Super admins can view franchise settings" ON franchise_settings;
DROP POLICY IF EXISTS "Super admins can manage franchise settings" ON franchise_settings;

-- Add policies for super admin to access franchise data
CREATE POLICY "Super admins can view all franchises"
ON franchises FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = auth.uid()
  )
);

CREATE POLICY "Super admins can manage franchises"
ON franchises FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = auth.uid()
  )
);

-- Add policies for related tables
CREATE POLICY "Super admins can view franchise settings"
ON franchise_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = auth.uid()
  )
);

CREATE POLICY "Super admins can manage franchise settings"
ON franchise_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = auth.uid()
  )
);

-- Make sure RLS is enabled on necessary tables
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_settings ENABLE ROW LEVEL SECURITY;