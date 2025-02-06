-- Drop all existing policies first
DROP POLICY IF EXISTS "allow_select_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_admin_select_franchise_profiles" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_admin_update_franchise_profiles" ON profiles;
DROP POLICY IF EXISTS "allow_admin_insert_profiles" ON profiles;

-- Create a secure function to fetch profile
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
BEGIN
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
    WHERE p.id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_profile TO authenticated;

-- Simple policies for basic operations
CREATE POLICY "enable_own_access"
    ON profiles FOR ALL
    USING (auth.uid() = id);

-- Admin policies for franchise management
CREATE POLICY "enable_admin_franchise_access"
    ON profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
            AND p.franchise_id = profiles.franchise_id
        )
    );