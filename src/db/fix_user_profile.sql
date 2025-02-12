-- Drop existing functions
DROP FUNCTION IF EXISTS get_user_profile(UUID);

-- Create new function returning proper profile format
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth_user auth.users%ROWTYPE;
    v_staff staff%ROWTYPE;
    v_franchise_id UUID;
    result_json JSONB;
BEGIN
    -- Get auth user
    SELECT * INTO v_auth_user
    FROM auth.users
    WHERE id = user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auth user not found';
    END IF;

    -- Try to get existing staff record
    SELECT * INTO v_staff
    FROM staff s
    WHERE s.auth_id = user_id;

    -- If staff record exists, return it
    IF FOUND THEN
        RETURN jsonb_build_object(
            'id', v_staff.auth_id,
            'email', v_staff.email,
            'franchise_id', v_staff.franchise_id,
            'role', v_staff.role,
            'full_name', v_staff.full_name,
            'created_at', v_staff.created_at,
            'updated_at', v_staff.updated_at,
            'phone', v_staff.phone,
            'is_active', v_staff.status = 'active',
            'joining_date', v_staff.joining_date,
            'salary', v_staff.hourly_rate,
            'shift', v_staff.shift,
            'can_manage_staff', v_staff.can_manage_staff,
            'can_void_orders', v_staff.can_void_orders,
            'can_modify_menu', v_staff.can_modify_menu
        );
    END IF;

    -- Get default franchise
    SELECT id INTO v_franchise_id
    FROM franchises
    ORDER BY created_at
    LIMIT 1;

    -- Create new staff record
    INSERT INTO staff (
        auth_id,
        email,
        franchise_id,
        full_name,
        role,
        status,
        created_at,
        updated_at,
        can_manage_staff,
        can_void_orders,
        can_modify_menu
    ) VALUES (
        user_id,
        v_auth_user.email,
        v_franchise_id,
        COALESCE(v_auth_user.raw_user_meta_data->>'name', split_part(v_auth_user.email, '@', 1)),
        'admin',
        'active',
        now(),
        now(),
        true,  -- Admin gets all permissions
        true,
        true
    )
    RETURNING jsonb_build_object(
        'id', auth_id,
        'email', email,
        'franchise_id', franchise_id,
        'role', role,
        'full_name', full_name,
        'created_at', created_at,
        'updated_at', updated_at,
        'phone', phone,
        'is_active', status = 'active',
        'joining_date', joining_date,
        'salary', hourly_rate,
        'shift', shift,
        'can_manage_staff', can_manage_staff,
        'can_void_orders', can_void_orders,
        'can_modify_menu', can_modify_menu
    )
    INTO result_json;

    RETURN result_json;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION get_user_profile(UUID) IS 'Gets or creates staff profile data for the authenticated user';