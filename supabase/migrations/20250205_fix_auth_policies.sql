-- First, drop all existing policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "allow_select_own_or_admin_franchise_20250205" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_or_admin_franchise_20250205" ON profiles;
DROP POLICY IF EXISTS "allow_select_own_or_admin_20250129" ON profiles;
DROP POLICY IF EXISTS "allow_insert_own_or_admin_20250129" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_or_admin_20250129" ON profiles;

-- Create a function to check if a user is an admin that avoids recursion
CREATE OR REPLACE FUNCTION is_admin_simple(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Direct check without using RLS
    RETURN EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = user_id 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Basic select policy
CREATE POLICY "allow_select_own_profile"
    ON profiles FOR SELECT
    USING (
        -- Users can always read their own profile
        auth.uid() = id
    );

-- Admin select policy
CREATE POLICY "allow_admin_select_franchise_profiles"
    ON profiles FOR SELECT
    USING (
        -- Admins can read profiles from their franchise
        EXISTS (
            SELECT 1
            FROM profiles admin_profile
            WHERE admin_profile.id = auth.uid()
            AND admin_profile.role = 'admin'
            AND admin_profile.franchise_id = profiles.franchise_id
        )
    );

-- Basic update policy
CREATE POLICY "allow_update_own_profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admin update policy
CREATE POLICY "allow_admin_update_franchise_profiles"
    ON profiles FOR UPDATE
    USING (
        -- Admins can update profiles from their franchise
        EXISTS (
            SELECT 1
            FROM profiles admin_profile
            WHERE admin_profile.id = auth.uid()
            AND admin_profile.role = 'admin'
            AND admin_profile.franchise_id = profiles.franchise_id
        )
    )
    WITH CHECK (
        -- Ensure franchise_id matches admin's franchise
        EXISTS (
            SELECT 1
            FROM profiles admin_profile
            WHERE admin_profile.id = auth.uid()
            AND admin_profile.role = 'admin'
            AND admin_profile.franchise_id = profiles.franchise_id
        )
    );

-- Admin insert policy
CREATE POLICY "allow_admin_insert_profiles"
    ON profiles FOR INSERT
    WITH CHECK (
        -- Admins can insert new profiles for their franchise
        EXISTS (
            SELECT 1
            FROM profiles admin_profile
            WHERE admin_profile.id = auth.uid()
            AND admin_profile.role = 'admin'
            AND admin_profile.franchise_id = franchise_id
        )
    );

-- Grant necessary permissions to authenticated users
GRANT ALL ON profiles TO authenticated;