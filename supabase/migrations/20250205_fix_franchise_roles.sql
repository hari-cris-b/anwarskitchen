-- First clean up existing policies
DROP POLICY IF EXISTS "Staff can view their franchise" ON franchises;
DROP POLICY IF EXISTS "Admin can view all franchises" ON franchises;
DROP POLICY IF EXISTS "franchise_owner_select" ON franchises;
DROP POLICY IF EXISTS "super_admin_all" ON franchises;

-- Update profiles role constraint
DO $$ 
BEGIN
    -- Remove existing role constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
    END IF;

    -- Add new role constraint with all supported roles
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('staff', 'manager', 'admin'));

    -- Update any existing super_admin roles to admin
    UPDATE profiles 
    SET role = 'admin' 
    WHERE role = 'super_admin';

    -- Update any existing franchise_owner roles to manager
    UPDATE profiles 
    SET role = 'manager' 
    WHERE role = 'franchise_owner';
END $$;

-- Create new unified franchise policies
CREATE POLICY "franchise_access" ON franchises
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                -- Admin can access all franchises
                profiles.role = 'admin'
                OR 
                -- Staff and managers can only access their assigned franchise
                (profiles.role IN ('staff', 'manager') AND profiles.franchise_id = franchises.id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Update franchise_settings policy to match
DROP POLICY IF EXISTS "franchise_settings_access" ON franchise_settings;
CREATE POLICY "franchise_settings_access" ON franchise_settings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                -- Admin can access all settings
                profiles.role = 'admin'
                OR 
                -- Staff and managers can only access their franchise settings
                (profiles.role IN ('staff', 'manager') AND profiles.franchise_id = franchise_settings.id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR 
                 (profiles.role = 'manager' AND profiles.franchise_id = franchise_settings.id))
        )
    );

-- Update daily_sales policy to match
DROP POLICY IF EXISTS "daily_sales_owner_select" ON daily_sales;
DROP POLICY IF EXISTS "daily_sales_super_admin_all" ON daily_sales;
CREATE POLICY "daily_sales_access" ON daily_sales
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                -- Admin can access all sales data
                profiles.role = 'admin'
                OR 
                -- Staff and managers can only access their franchise sales
                (profiles.role IN ('staff', 'manager') AND profiles.franchise_id = daily_sales.franchise_id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR 
                 (profiles.role = 'manager' AND profiles.franchise_id = daily_sales.franchise_id))
        )
    );

-- Remove is_admin function if it exists and create new one
DROP FUNCTION IF EXISTS is_admin CASCADE;
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;