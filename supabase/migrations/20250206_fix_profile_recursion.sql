-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Admin view any profile" ON profiles;
DROP POLICY IF EXISTS "enable_admin_franchise_access" ON profiles;
DROP POLICY IF EXISTS "Staff can manage menu items" ON menu_items;
DROP POLICY IF EXISTS "Everyone can view menu items" ON menu_items;
DROP POLICY IF EXISTS "View own profile" ON profiles;
DROP POLICY IF EXISTS "Basic profile access" ON profiles;
DROP POLICY IF EXISTS "Staff can view own profile" ON profiles;
DROP POLICY IF EXISTS "Staff can update own profile" ON profiles;
DROP POLICY IF EXISTS "Staff can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admin view franchise profiles" ON profiles;
DROP POLICY IF EXISTS "Admin manage franchise profiles" ON profiles;
DROP POLICY IF EXISTS "enable_own_access" ON profiles;

-- Update get_user_profile function to handle admin access
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    franchise_id UUID,
    role TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    phone TEXT,
    is_active BOOLEAN,
    joining_date DATE,
    salary NUMERIC,
    shift TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_requester_role TEXT;
    v_requester_franchise_id UUID;
BEGIN
    -- Get the requesting user's role and franchise_id
    SELECT p.role, p.franchise_id INTO v_requester_role, v_requester_franchise_id
    FROM profiles p
    WHERE p.id = auth.uid();

    RETURN QUERY 
    SELECT 
        p.id,
        p.email,
        p.franchise_id,
        p.role,
        p.full_name,
        p.created_at,
        p.updated_at,
        p.phone,
        p.is_active,
        p.joining_date,
        p.salary,
        p.shift
    FROM profiles p
    WHERE p.id = user_id
    AND (
        -- Allow if it's the user's own profile
        p.id = auth.uid()
        OR 
        -- Allow if requester is admin and profile is in same franchise
        (v_requester_role = 'admin' AND v_requester_franchise_id = p.franchise_id)
    );
END;
$$;

-- Create a secure function for menu item access
CREATE OR REPLACE FUNCTION get_franchise_menu_items(franchise_id_param UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    price NUMERIC,
    category TEXT,
    tax_rate NUMERIC,
    is_active BOOLEAN,
    franchise_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_franchise_id UUID;
BEGIN
    -- Get user's franchise_id
    SELECT p.franchise_id INTO v_user_franchise_id
    FROM profiles p
    WHERE p.id = auth.uid();

    -- Return menu items only if user has access to this franchise
    IF v_user_franchise_id = franchise_id_param THEN
        RETURN QUERY
        SELECT m.*
        FROM menu_items m
        WHERE m.franchise_id = franchise_id_param
        AND m.is_active = true
        ORDER BY m.name;
    END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_franchise_menu_items TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile TO authenticated;

-- Create new simplified policies with unique names
CREATE POLICY "profiles_view_own_20250206" ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "profiles_access_franchise_20250206" ON profiles
    FOR ALL
    TO authenticated
    USING (
        -- Allow access to profiles in user's franchise
        franchise_id = (
            SELECT p.franchise_id 
            FROM profiles p
            WHERE p.id = auth.uid()
            LIMIT 1
        )
    );

-- Remove RLS from menu_items since we're using a secure function
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;