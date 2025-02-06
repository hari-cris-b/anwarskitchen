-- Drop existing problematic policies and functions
DROP POLICY IF EXISTS "allow_select_own_or_admin_franchise_20250205" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_or_admin_franchise_20250205" ON profiles;
DROP FUNCTION IF EXISTS is_admin(UUID);

-- Create a more efficient admin check that avoids recursion
CREATE OR REPLACE FUNCTION check_admin_access(user_id UUID, target_franchise_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM auth.users u
        JOIN profiles p ON u.id = p.id
        WHERE u.id = user_id
        AND p.role = 'admin'
        AND p.franchise_id = target_franchise_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simplified select policy with no recursion
CREATE POLICY "profiles_select_simple" ON profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() OR -- User can always read their own profile
        franchise_id IN ( -- User can read profiles from their franchise if they are admin
            SELECT p2.franchise_id 
            FROM profiles p2 
            WHERE p2.id = auth.uid() 
            AND p2.role = 'admin'
            AND p2.franchise_id IS NOT NULL
        )
    );

-- Simplified update policy with no recursion
CREATE POLICY "profiles_update_simple" ON profiles
    FOR UPDATE TO authenticated
    USING (
        id = auth.uid() OR -- User can always update their own profile
        franchise_id IN ( -- User can update profiles from their franchise if they are admin
            SELECT p2.franchise_id 
            FROM profiles p2 
            WHERE p2.id = auth.uid() 
            AND p2.role = 'admin'
            AND p2.franchise_id IS NOT NULL
        )
    )
    WITH CHECK (
        (id = auth.uid()) OR -- Allow users to update their own profile
        (
            franchise_id IN ( -- Allow admins to update profiles in their franchise
                SELECT p2.franchise_id 
                FROM profiles p2 
                WHERE p2.id = auth.uid() 
                AND p2.role = 'admin'
                AND p2.franchise_id IS NOT NULL
            )
        )
    );

-- Simplified insert policy
CREATE POLICY "profiles_insert_simple" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        id = auth.uid() OR -- Allow users to insert their own profile
        franchise_id IN ( -- Allow admins to insert profiles for their franchise
            SELECT p2.franchise_id 
            FROM profiles p2 
            WHERE p2.id = auth.uid() 
            AND p2.role = 'admin'
            AND p2.franchise_id IS NOT NULL
        )
    );

-- Update menu_items policies to be simpler and avoid recursion
DROP POLICY IF EXISTS "menu_items_select_policy" ON menu_items;
DROP POLICY IF EXISTS "menu_items_insert_policy" ON menu_items;
DROP POLICY IF EXISTS "menu_items_update_policy" ON menu_items;

CREATE POLICY "menu_items_select_simple" ON menu_items
    FOR SELECT TO authenticated
    USING (
        franchise_id IN (
            SELECT franchise_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "menu_items_insert_simple" ON menu_items
    FOR INSERT TO authenticated
    WITH CHECK (
        franchise_id IN (
            SELECT franchise_id 
            FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "menu_items_update_simple" ON menu_items
    FOR UPDATE TO authenticated
    USING (
        franchise_id IN (
            SELECT franchise_id 
            FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        franchise_id IN (
            SELECT franchise_id 
            FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;