-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "allow_select_own_or_admin_franchise_20250205" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_or_admin_franchise_20250205" ON profiles;
DROP POLICY IF EXISTS "allow_select_own_or_admin_20250129" ON profiles;
DROP POLICY IF EXISTS "allow_insert_own_or_admin_20250129" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_or_admin_20250129" ON profiles;

-- Create new policies without recursion
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() OR -- Users can read their own profile
        (role = 'admin' AND -- Admins can read profiles in their franchise
         franchise_id = (SELECT p.franchise_id FROM profiles p WHERE p.id = auth.uid()))
    );

CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        id = auth.uid() OR -- Users can insert their own profile
        (role = 'admin' AND -- Admins can insert profiles in their franchise
         franchise_id = (SELECT p.franchise_id FROM profiles p WHERE p.id = auth.uid()))
    );

CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE TO authenticated
    USING (
        id = auth.uid() OR -- Users can update their own profile
        (role = 'admin' AND -- Admins can update profiles in their franchise
         franchise_id = (SELECT p.franchise_id FROM profiles p WHERE p.id = auth.uid()))
    )
    WITH CHECK (
        id = auth.uid() OR -- Users can update their own profile
        (role = 'admin' AND -- Admins can update profiles in their franchise
         franchise_id = (SELECT p.franchise_id FROM profiles p WHERE p.id = auth.uid()))
    );

-- Drop the is_admin function since we're not using it anymore
DROP FUNCTION IF EXISTS is_admin(UUID);