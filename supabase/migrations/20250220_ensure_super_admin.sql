-- Begin transaction
BEGIN;

-- Create type if not exists
DO $$ BEGIN
    CREATE TYPE temp_result AS (
        action text,
        status text,
        details jsonb
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Function to ensure super admin exists and is linked
CREATE OR REPLACE FUNCTION ensure_initial_super_admin(
    p_email text DEFAULT 'harikrish120027@gmail.com',
    p_full_name text DEFAULT 'System Administrator'
)
RETURNS SETOF temp_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth_id uuid;
    v_super_admin_id uuid;
    v_existing_auth_id uuid;
    v_result temp_result;
BEGIN
    -- Check if super admin exists
    SELECT id, auth_id INTO v_super_admin_id, v_existing_auth_id
    FROM super_admin
    WHERE email = p_email
    LIMIT 1;

    IF v_super_admin_id IS NULL THEN
        -- Create super admin
        INSERT INTO super_admin (email, full_name)
        VALUES (p_email, p_full_name)
        RETURNING id INTO v_super_admin_id;

        v_result := ('create_super_admin', 'success', jsonb_build_object('id', v_super_admin_id))::temp_result;
        RETURN NEXT v_result;
    ELSE
        v_result := ('check_super_admin', 'exists', jsonb_build_object('id', v_super_admin_id))::temp_result;
        RETURN NEXT v_result;
    END IF;

    -- Check if auth user exists
    SELECT id INTO v_auth_id
    FROM auth.users
    WHERE email = p_email
    LIMIT 1;

    IF v_auth_id IS NULL THEN
        v_result := ('check_auth_user', 'not_found', jsonb_build_object('email', p_email))::temp_result;
        RETURN NEXT v_result;
    ELSE
        -- If auth user exists but not linked
        IF v_existing_auth_id IS NULL THEN
            UPDATE super_admin
            SET auth_id = v_auth_id,
                updated_at = now()
            WHERE id = v_super_admin_id;

            v_result := ('link_auth_user', 'success', jsonb_build_object(
                'super_admin_id', v_super_admin_id,
                'auth_id', v_auth_id
            ))::temp_result;
            RETURN NEXT v_result;
        ELSE
            v_result := ('check_auth_link', 'already_linked', jsonb_build_object(
                'super_admin_id', v_super_admin_id,
                'auth_id', v_existing_auth_id
            ))::temp_result;
            RETURN NEXT v_result;
        END IF;
    END IF;

    -- Verify role function works
    v_result := ('verify_role_function', CASE 
        WHEN EXISTS (
            SELECT 1 FROM get_user_role(v_auth_id)
            WHERE role_type = 'super_admin'
            AND is_super_admin = true
        ) THEN 'success' 
        ELSE 'failed'
    END, jsonb_build_object('auth_id', v_auth_id))::temp_result;
    RETURN NEXT v_result;
END;
$$;

-- Create verification function
CREATE OR REPLACE FUNCTION verify_super_admin_setup(p_auth_id uuid)
RETURNS TABLE (
    check_type text,
    status text,
    details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check auth user
    RETURN QUERY
    SELECT 
        'Auth User'::text,
        CASE WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = p_auth_id) 
             THEN 'Found' ELSE 'Not Found' END,
        'Auth ID: ' || p_auth_id::text;

    -- Check super admin link
    RETURN QUERY
    SELECT 
        'Super Admin Link'::text,
        CASE WHEN EXISTS (SELECT 1 FROM super_admin WHERE auth_id = p_auth_id)
             THEN 'Linked' ELSE 'Not Linked' END,
        'Auth ID: ' || p_auth_id::text;

    -- Check role function
    RETURN QUERY
    SELECT 
        'Role Function'::text,
        CASE WHEN EXISTS (
            SELECT 1 FROM get_user_role(p_auth_id)
            WHERE role_type = 'super_admin'
            AND is_super_admin = true
        ) THEN 'Working' ELSE 'Not Working' END,
        'Checking role access';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION ensure_initial_super_admin(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_super_admin_setup(uuid) TO authenticated;

-- Initial setup and verification
DO $$
DECLARE
    v_current_auth_id uuid;
BEGIN
    -- Get current auth ID
    v_current_auth_id := auth.uid();
    
    -- Run initial setup
    PERFORM ensure_initial_super_admin();
    
    -- Run verification for current user
    PERFORM verify_super_admin_setup(v_current_auth_id);
END;
$$;

COMMIT;