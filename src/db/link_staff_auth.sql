-- Drop existing function if it exists
DROP FUNCTION IF EXISTS link_staff_auth();

CREATE OR REPLACE FUNCTION link_staff_auth()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    staff_record RECORD;
    auth_user_id UUID;
    result_json JSONB := '[]'::JSONB;
BEGIN
    -- Process each staff member
    FOR staff_record IN SELECT * FROM staff WHERE auth_id IS NULL LOOP
        -- Generate UUID for auth user
        auth_user_id := gen_random_uuid();
        
        -- Create auth user with basic info
        INSERT INTO auth.users (
            id,                    -- Required
            instance_id,          -- Use default uuid
            email,                -- From staff
            email_confirmed_at,   -- Set to now() since we're creating directly
            created_at,           -- From staff
            updated_at,           -- From staff
            is_sso_user,         -- Default false
            raw_app_meta_data,    -- Required metadata
            raw_user_meta_data    -- Required metadata
        ) VALUES (
            auth_user_id,
            '00000000-0000-0000-0000-000000000000'::uuid,
            staff_record.email,
            now(),
            staff_record.created_at,
            staff_record.updated_at,
            false,
            jsonb_build_object(
                'provider', 'email',
                'providers', ARRAY['email']
            ),
            jsonb_build_object(
                'franchise_id', staff_record.franchise_id,
                'role', staff_record.role,
                'name', staff_record.full_name
            )
        );

        -- Link auth user to staff
        UPDATE staff 
        SET auth_id = auth_user_id
        WHERE id = staff_record.id;

        -- Add to result
        result_json := result_json || jsonb_build_object(
            'email', staff_record.email,
            'role', staff_record.role,
            'auth_id', auth_user_id,
            'status', 'created and linked'
        );
    END LOOP;

    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'Auth users created and linked. Set passwords via Supabase admin.',
        'details', result_json
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'status', 'error',
        'message', SQLERRM,
        'details', result_json
    );
END;
$$;

-- Example usage:
-- SELECT link_staff_auth();