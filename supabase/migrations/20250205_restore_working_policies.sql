-- Drop all existing problematic policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_update_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_simple" ON profiles;
DROP POLICY IF EXISTS "allow_select_own_or_admin_franchise_20250205" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_or_admin_franchise_20250205" ON profiles;
DROP POLICY IF EXISTS "allow_select_own_or_admin_20250129" ON profiles;
DROP POLICY IF EXISTS "allow_insert_own_or_admin_20250129" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_or_admin_20250129" ON profiles;

-- Drop menu items policies
DROP POLICY IF EXISTS "menu_items_select_policy" ON menu_items;
DROP POLICY IF EXISTS "menu_items_insert_policy" ON menu_items;
DROP POLICY IF EXISTS "menu_items_update_policy" ON menu_items;
DROP POLICY IF EXISTS "Everyone can view menu items" ON menu_items;
DROP POLICY IF EXISTS "Admin can manage menu items" ON menu_items;

-- Restore original working profile policies
CREATE POLICY "Staff can view own profile" ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Staff can update own profile" ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Staff can insert own profile" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Restore original working menu items policies
CREATE POLICY "Everyone can view menu items" ON menu_items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.franchise_id = menu_items.franchise_id
        )
    );

CREATE POLICY "Staff can manage menu items" ON menu_items
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.franchise_id = menu_items.franchise_id
            AND profiles.role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.franchise_id = menu_items.franchise_id
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Add admin access for profiles
CREATE POLICY "Admin view any profile" ON profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND (p.franchise_id = profiles.franchise_id OR profiles.id = auth.uid())
        )
    );

CREATE POLICY "Admin manage franchise profiles" ON profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.franchise_id = profiles.franchise_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.franchise_id = profiles.franchise_id
        )
    );

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;