-- Create a materialized view for user permissions that bypasses RLS
CREATE MATERIALIZED VIEW user_permissions AS
SELECT 
    p.id as user_id,
    p.franchise_id,
    p.role,
    p.is_active
FROM profiles p
WHERE p.is_active = true;

-- Create index for better performance
CREATE UNIQUE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_franchise ON user_permissions(franchise_id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_user_permissions()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_permissions;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to refresh permissions when profiles change
CREATE TRIGGER refresh_user_permissions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_user_permissions();

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "profiles_select_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_update_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_simple" ON profiles;
DROP POLICY IF EXISTS "menu_items_select_simple" ON menu_items;
DROP POLICY IF EXISTS "menu_items_insert_simple" ON menu_items;
DROP POLICY IF EXISTS "menu_items_update_simple" ON menu_items;

-- Create new policies using the materialized view
CREATE POLICY "profiles_select_no_recursion" ON profiles
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = auth.uid()
            AND (
                up.user_id = profiles.id OR  -- Own profile
                (up.role = 'admin' AND up.franchise_id = profiles.franchise_id)  -- Admin access
            )
        )
    );

CREATE POLICY "profiles_update_no_recursion" ON profiles
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = auth.uid()
            AND (
                up.user_id = profiles.id OR  -- Own profile
                (up.role = 'admin' AND up.franchise_id = profiles.franchise_id)  -- Admin access
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = auth.uid()
            AND (
                up.user_id = profiles.id OR  -- Own profile
                (up.role = 'admin' AND up.franchise_id = profiles.franchise_id)  -- Admin access
            )
        )
    );

CREATE POLICY "profiles_insert_no_recursion" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = auth.uid()
            AND (
                up.user_id = profiles.id OR  -- Own profile
                (up.role = 'admin' AND up.franchise_id = profiles.franchise_id)  -- Admin access
            )
        )
    );

CREATE POLICY "menu_items_select_no_recursion" ON menu_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = auth.uid()
            AND up.franchise_id = menu_items.franchise_id
        )
    );

CREATE POLICY "menu_items_insert_no_recursion" ON menu_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = auth.uid()
            AND up.franchise_id = menu_items.franchise_id
            AND up.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "menu_items_update_no_recursion" ON menu_items
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = auth.uid()
            AND up.franchise_id = menu_items.franchise_id
            AND up.role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = auth.uid()
            AND up.franchise_id = menu_items.franchise_id
            AND up.role IN ('admin', 'manager')
        )
    );

-- Initial refresh of the materialized view
REFRESH MATERIALIZED VIEW user_permissions;