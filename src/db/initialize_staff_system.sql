-- Drop existing function if it exists
DROP FUNCTION IF EXISTS initialize_staff_system(UUID);

-- Function to initialize staff system with default roles
CREATE OR REPLACE FUNCTION initialize_staff_system(franchise_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    created_ids JSONB := '{}'::JSONB;
    staff_id UUID;
BEGIN
    -- Create admin
    INSERT INTO staff (
        franchise_id,
        full_name,
        email,
        role,
        status,
        can_void_orders,
        can_modify_menu,
        can_manage_staff
    ) VALUES (
        franchise_id_param,
        'Admin User',
        'admin@franchise.com',
        'admin',
        'active',
        true,
        true,
        true
    ) RETURNING id INTO staff_id;
    created_ids = created_ids || jsonb_build_object('admin', staff_id);

    -- Create manager
    INSERT INTO staff (
        franchise_id,
        full_name,
        email,
        role,
        status,
        can_void_orders,
        can_modify_menu,
        can_manage_staff
    ) VALUES (
        franchise_id_param,
        'Manager User',
        'manager@franchise.com',
        'manager',
        'active',
        true,
        true,
        true
    ) RETURNING id INTO staff_id;
    created_ids = created_ids || jsonb_build_object('manager', staff_id);

    -- Create staff
    INSERT INTO staff (
        franchise_id,
        full_name,
        email,
        role,
        status,
        can_void_orders,
        can_modify_menu,
        can_manage_staff
    ) VALUES (
        franchise_id_param,
        'Staff User',
        'staff@franchise.com',
        'staff',
        'active',
        false,
        false,
        false
    ) RETURNING id INTO staff_id;
    created_ids = created_ids || jsonb_build_object('staff', staff_id);

    -- Create kitchen staff
    INSERT INTO staff (
        franchise_id,
        full_name,
        email,
        role,
        status,
        can_void_orders,
        can_modify_menu,
        can_manage_staff
    ) VALUES (
        franchise_id_param,
        'Kitchen User',
        'kitchen@franchise.com',
        'kitchen',
        'active',
        false,
        false,
        false
    ) RETURNING id INTO staff_id;
    created_ids = created_ids || jsonb_build_object('kitchen', staff_id);

    -- Return created staff IDs
    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'Staff system initialized successfully',
        'created_staff', created_ids
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'status', 'error',
        'message', SQLERRM,
        'created_staff', created_ids
    );
END;
$$;

-- Example usage:
-- SELECT initialize_staff_system('your-franchise-id-here');