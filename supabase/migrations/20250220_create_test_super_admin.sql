-- Begin transaction
BEGIN;

-- Function to safely create a test super admin
CREATE OR REPLACE FUNCTION create_test_super_admin(
    p_email text DEFAULT 'super@admin.com',
    p_full_name text DEFAULT 'Test Super Admin'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_staff_id uuid;
BEGIN
    -- Check if super admin already exists
    SELECT id INTO v_staff_id
    FROM staff
    WHERE email = p_email;

    -- If not exists, create one
    IF v_staff_id IS NULL THEN
        INSERT INTO staff (
            email,
            full_name,
            staff_type,
            status,
            can_manage_staff,
            can_void_orders,
            can_modify_menu,
            email_verified,
            permissions
        ) VALUES (
            p_email,
            p_full_name,
            'super_admin'::staff_role,
            'active',
            true,
            true,
            true,
            true,
            jsonb_build_object(
                'can_access_pos', true,
                'can_access_kitchen', true,
                'can_access_reports', true,
                'can_manage_menu', true,
                'can_manage_staff', true
            )
        )
        RETURNING id INTO v_staff_id;

        -- Log the creation
        INSERT INTO staff_activity (
            staff_id,
            action_type,
            action_details
        ) VALUES (
            v_staff_id,
            'super_admin_created',
            jsonb_build_object(
                'email', p_email,
                'created_at', now()
            )
        );
    END IF;

    RETURN v_staff_id;
END;
$$;

-- Create test super admin
SELECT create_test_super_admin();

-- Drop the function as it's no longer needed
DROP FUNCTION create_test_super_admin(text, text);

-- Add comment
COMMENT ON TABLE staff IS 'Staff members including super admins, managers, and regular staff';

COMMIT;