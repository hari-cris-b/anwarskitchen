-- Begin transaction
BEGIN;

-- Drop existing policies that depend on the function
DROP POLICY IF EXISTS "Super admins can view franchise settings" ON franchise_settings;
DROP POLICY IF EXISTS "Super admins can manage franchise settings" ON franchise_settings;
DROP POLICY IF EXISTS "Super admins can view all franchises" ON franchises;
DROP POLICY IF EXISTS "Super admins can manage franchises" ON franchises;
DROP POLICY IF EXISTS "Staff can view own franchise" ON franchises;

-- Create enum type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
        CREATE TYPE staff_role AS ENUM ('super_admin', 'admin', 'manager', 'kitchen', 'staff');
    END IF;
END $$;

-- Drop existing functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS is_super_admin_role() CASCADE;
DROP FUNCTION IF EXISTS check_super_admin_access() CASCADE;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role staff_role;
BEGIN
    SELECT staff_type::staff_role INTO user_role
    FROM staff s
    WHERE s.auth_id = auth.uid();

    RETURN user_role = 'super_admin'::staff_role;
EXCEPTION 
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- Create new policies for franchises table
CREATE POLICY "Staff can view own franchise" ON franchises
    FOR SELECT
    USING (
        id IN (
            SELECT franchise_id 
            FROM staff 
            WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Super admins can view all franchises" ON franchises
    FOR SELECT
    USING (is_super_admin_role());

CREATE POLICY "Super admins can manage franchises" ON franchises
    FOR ALL
    USING (is_super_admin_role())
    WITH CHECK (is_super_admin_role());

-- Create policies for franchise_settings
CREATE POLICY "Super admins can view franchise settings" ON franchise_settings
    FOR SELECT
    USING (is_super_admin_role());

CREATE POLICY "Super admins can manage franchise settings" ON franchise_settings
    FOR ALL
    USING (is_super_admin_role())
    WITH CHECK (is_super_admin_role());

-- Enable RLS on franchises table
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_settings ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON franchises TO authenticated;
GRANT ALL ON franchise_settings TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin_role TO authenticated;

-- Update settings column in franchises if it doesn't match schema
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'franchises' 
        AND column_name = 'settings'
    ) THEN
        -- Drop settings column if it exists
        ALTER TABLE franchises DROP COLUMN IF EXISTS settings;
    END IF;
END $$;

-- Add function to get franchise with settings
CREATE OR REPLACE FUNCTION get_franchise_with_settings(franchise_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    IF NOT is_super_admin_role() AND NOT EXISTS (
        SELECT 1 FROM staff 
        WHERE auth_id = auth.uid() 
        AND franchise_id = $1
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT 
        jsonb_build_object(
            'id', f.id,
            'name', f.name,
            'address', f.address,
            'created_at', f.created_at,
            'settings', jsonb_build_object(
                'business_name', fs.business_name,
                'tax_rate', fs.tax_rate,
                'currency', fs.currency,
                'business_hours', fs.business_hours,
                'theme', fs.theme,
                'subscription_status', fs.subscription_status
            )
        )
    INTO result
    FROM franchises f
    LEFT JOIN franchise_settings fs ON f.id = fs.franchise_id
    WHERE f.id = $1;

    RETURN result;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_franchise_with_settings(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION is_super_admin_role IS 'Checks if the current user has super admin role';
COMMENT ON FUNCTION get_franchise_with_settings IS 'Gets franchise details with settings for authorized users';

COMMIT;