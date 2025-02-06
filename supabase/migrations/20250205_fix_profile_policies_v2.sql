-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- Create new policies with direct checks
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() OR -- Users can read their own profile
        EXISTS ( -- Check if the user is an admin in the same franchise
            SELECT 1 FROM auth.users au 
            WHERE au.id = auth.uid() 
            AND EXISTS (
                SELECT 1 FROM profiles p2 
                WHERE p2.id = au.id 
                AND p2.role = 'admin' 
                AND p2.franchise_id = profiles.franchise_id
            )
        )
    );

CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        id = auth.uid() OR -- Users can insert their own profile
        EXISTS ( -- Check if the user is an admin in the same franchise
            SELECT 1 FROM profiles p2 
            WHERE p2.id = auth.uid() 
            AND p2.role = 'admin' 
            AND p2.franchise_id = profiles.franchise_id
        )
    );

CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE TO authenticated
    USING (
        id = auth.uid() OR -- Users can update their own profile
        EXISTS ( -- Check if the user is an admin in the same franchise
            SELECT 1 FROM profiles p2 
            WHERE p2.id = auth.uid() 
            AND p2.role = 'admin' 
            AND p2.franchise_id = profiles.franchise_id
        )
    )
    WITH CHECK (
        id = auth.uid() OR -- Users can update their own profile
        EXISTS ( -- Check if the user is an admin in the same franchise
            SELECT 1 FROM profiles p2 
            WHERE p2.id = auth.uid() 
            AND p2.role = 'admin' 
            AND p2.franchise_id = profiles.franchise_id
        )
    );