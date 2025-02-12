-- Drop existing functions
DROP FUNCTION IF EXISTS get_franchise_staff(UUID);
DROP FUNCTION IF EXISTS get_staff_count_by_role(UUID);
DROP FUNCTION IF EXISTS get_staff_by_role(UUID, staff_role);
DROP FUNCTION IF EXISTS update_staff_status(UUID, status_type);

-- Create get_franchise_staff function
CREATE OR REPLACE FUNCTION get_franchise_staff(franchise_id_input UUID)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT jsonb_build_object(
        'id', s.id,
        'auth_id', s.auth_id,
        'email', s.email,
        'franchise_id', s.franchise_id,
        'role', s.role,
        'full_name', s.full_name,
        'phone', s.phone,
        'shift', s.shift,
        'hourly_rate', s.hourly_rate,
        'status', s.status,
        'joining_date', s.joining_date,
        'created_at', s.created_at,
        'updated_at', s.updated_at,
        'pin_code', s.pin_code,
        'can_manage_staff', s.can_manage_staff,
        'can_void_orders', s.can_void_orders,
        'can_modify_menu', s.can_modify_menu,
        'permissions', jsonb_build_object(
            'canManageStaff', s.can_manage_staff,
            'canViewStaff', true,
            'canEditStaff', s.can_manage_staff,
            'canDeleteStaff', s.role = 'admin'
        )
    )
    FROM staff s
    WHERE s.franchise_id = franchise_id_input
    ORDER BY s.full_name;
END;
$$;

-- Create get_staff_count_by_role function
CREATE OR REPLACE FUNCTION get_staff_count_by_role(franchise_id_input UUID)
RETURNS TABLE (
    role staff_role,
    count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.role,
        COUNT(*)::bigint
    FROM staff s
    WHERE s.franchise_id = franchise_id_input
    GROUP BY s.role
    ORDER BY s.role;
END;
$$;

-- Create get_staff_by_role function
CREATE OR REPLACE FUNCTION get_staff_by_role(
    franchise_id_input UUID,
    role_input staff_role
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT jsonb_build_object(
        'id', s.id,
        'auth_id', s.auth_id,
        'email', s.email,
        'franchise_id', s.franchise_id,
        'role', s.role,
        'full_name', s.full_name,
        'phone', s.phone,
        'shift', s.shift,
        'hourly_rate', s.hourly_rate,
        'status', s.status,
        'joining_date', s.joining_date,
        'created_at', s.created_at,
        'updated_at', s.updated_at,
        'pin_code', s.pin_code,
        'can_manage_staff', s.can_manage_staff,
        'can_void_orders', s.can_void_orders,
        'can_modify_menu', s.can_modify_menu,
        'permissions', jsonb_build_object(
            'canManageStaff', s.can_manage_staff,
            'canViewStaff', true,
            'canEditStaff', s.can_manage_staff,
            'canDeleteStaff', s.role = 'admin'
        )
    )
    FROM staff s
    WHERE s.franchise_id = franchise_id_input
    AND s.role = role_input
    ORDER BY s.full_name;
END;
$$;

-- Create update_staff_status function
CREATE OR REPLACE FUNCTION update_staff_status(
    staff_id_input UUID,
    new_status status_type
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    UPDATE staff s
    SET 
        status = new_status,
        updated_at = now()
    WHERE id = staff_id_input
    RETURNING jsonb_build_object(
        'id', s.id,
        'auth_id', s.auth_id,
        'email', s.email,
        'franchise_id', s.franchise_id,
        'role', s.role,
        'full_name', s.full_name,
        'phone', s.phone,
        'shift', s.shift,
        'hourly_rate', s.hourly_rate,
        'status', s.status,
        'joining_date', s.joining_date,
        'created_at', s.created_at,
        'updated_at', s.updated_at,
        'pin_code', s.pin_code,
        'can_manage_staff', s.can_manage_staff,
        'can_void_orders', s.can_void_orders,
        'can_modify_menu', s.can_modify_menu,
        'permissions', jsonb_build_object(
            'canManageStaff', s.can_manage_staff,
            'canViewStaff', true,
            'canEditStaff', s.can_manage_staff,
            'canDeleteStaff', s.role = 'admin'
        )
    )
    INTO result;

    RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_franchise_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_count_by_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_by_role(UUID, staff_role) TO authenticated;
GRANT EXECUTE ON FUNCTION update_staff_status(UUID, status_type) TO authenticated;