-- Create a function to handle user profile claims in JWT
CREATE OR REPLACE FUNCTION handle_user_profile()
RETURNS trigger AS $$
DECLARE
    profile_data profiles;
BEGIN
    -- Get the user's profile data
    SELECT * INTO profile_data
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1;

    -- Update user's JWT claims with profile data
    IF profile_data.id IS NOT NULL THEN
        UPDATE auth.users
        SET raw_app_meta_data = jsonb_set(
            raw_app_meta_data,
            '{profile}',
            jsonb_build_object(
                'role', profile_data.role,
                'franchise_id', profile_data.franchise_id
            )
        )
        WHERE id = auth.uid();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update JWT claims when profile changes
DROP TRIGGER IF EXISTS on_profile_updated ON profiles;
CREATE TRIGGER on_profile_updated
    AFTER INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_profile();

-- Drop all existing policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "allow_select_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_admin_select_franchise_profiles" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_admin_update_franchise_profiles" ON profiles;
DROP POLICY IF EXISTS "allow_admin_insert_profiles" ON profiles;

-- Create new policies using JWT claims
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() OR -- Users can read their own profile
        (
            (auth.jwt() ->> 'role')::text = 'admin' AND -- Admin check using JWT
            (auth.jwt() ->> 'franchise_id')::uuid = franchise_id -- Franchise check using JWT
        )
    );

CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        id = auth.uid() OR -- Users can insert their own profile
        (
            (auth.jwt() ->> 'role')::text = 'admin' AND -- Admin check using JWT
            (auth.jwt() ->> 'franchise_id')::uuid = franchise_id -- Franchise check using JWT
        )
    );

CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE TO authenticated
    USING (
        id = auth.uid() OR -- Users can update their own profile
        (
            (auth.jwt() ->> 'role')::text = 'admin' AND -- Admin check using JWT
            (auth.jwt() ->> 'franchise_id')::uuid = franchise_id -- Franchise check using JWT
        )
    )
    WITH CHECK (
        id = auth.uid() OR -- Users can update their own profile
        (
            (auth.jwt() ->> 'role')::text = 'admin' AND -- Admin check using JWT
            (auth.jwt() ->> 'franchise_id')::uuid = franchise_id -- Franchise check using JWT
        )
    );

-- Update menu_items policies to use JWT claims as well
DROP POLICY IF EXISTS "menu_items_select_policy" ON menu_items;
DROP POLICY IF EXISTS "menu_items_insert_policy" ON menu_items;
DROP POLICY IF EXISTS "menu_items_update_policy" ON menu_items;

CREATE POLICY "menu_items_select_policy" ON menu_items
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() ->> 'franchise_id')::uuid = franchise_id
    );

CREATE POLICY "menu_items_insert_policy" ON menu_items
    FOR INSERT TO authenticated
    WITH CHECK (
        (auth.jwt() ->> 'franchise_id')::uuid = franchise_id AND
        (auth.jwt() ->> 'role')::text IN ('admin', 'manager')
    );

CREATE POLICY "menu_items_update_policy" ON menu_items
    FOR UPDATE TO authenticated
    USING (
        (auth.jwt() ->> 'franchise_id')::uuid = franchise_id AND
        (auth.jwt() ->> 'role')::text IN ('admin', 'manager')
    )
    WITH CHECK (
        (auth.jwt() ->> 'franchise_id')::uuid = franchise_id AND
        (auth.jwt() ->> 'role')::text IN ('admin', 'manager')
    );