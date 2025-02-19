-- Add policies for super admin to access franchise data
CREATE OR REPLACE POLICY "Super admins can view all franchises"
ON franchises FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = auth.uid()
  )
);

CREATE OR REPLACE POLICY "Super admins can manage franchises"
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
CREATE OR REPLACE POLICY "Super admins can view franchise settings"
ON franchise_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = auth.uid()
  )
);

CREATE OR REPLACE POLICY "Super admins can manage franchise settings"
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