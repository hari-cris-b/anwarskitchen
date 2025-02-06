CREATE OR REPLACE FUNCTION get_staff_with_auth(franchise_id_param UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    phone TEXT,
    is_active BOOLEAN,
    joining_date DATE,
    salary NUMERIC,
    shift TEXT,
    franchise_id UUID,
    last_sign_in_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        u.email,
        p.role,
        p.phone,
        p.is_active,
        p.joining_date,
        p.salary,
        p.shift,
        p.franchise_id,
        u.last_sign_in_at
    FROM profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.franchise_id = franchise_id_param
    ORDER BY p.full_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_staff_with_auth TO authenticated;