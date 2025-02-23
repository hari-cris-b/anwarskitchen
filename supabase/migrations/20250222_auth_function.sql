-- Begin transaction
BEGIN;

-- Create a secure signup function
CREATE OR REPLACE FUNCTION create_staff_user(
    p_email text,
    p_password text,
    p_staff_id uuid,
    p_franchise_id uuid,
    p_role text,
    p_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id uuid;
    v_result json;
BEGIN
    -- Verify staff status
    IF NOT EXISTS (
        SELECT 1 
        FROM staff 
        WHERE id = p_staff_id 
        AND email = p_email 
        AND email_verified = true 
        AND auth_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Invalid staff status';
    END IF;

    -- Create auth user
    INSERT INTO auth.users (
        email,
        encrypted_password,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        email_confirmed_at
    ) VALUES (
        p_email,
        crypt(p_password, gen_salt('bf')),
        jsonb_build_object(
            'staff_id', p_staff_id,
            'franchise_id', p_franchise_id,
            'role', p_role,
            'email_verified', true
        ),
        jsonb_build_object(
            'name', p_name
        ),
        now(),
        now(),
        now()
    )
    RETURNING id INTO v_user_id;

    -- Update staff record
    UPDATE staff 
    SET auth_id = v_user_id
    WHERE id = p_staff_id;

    -- Return success result
    v_result := json_build_object(
        'user_id', v_user_id,
        'email', p_email,
        'staff_id', p_staff_id
    );

    RETURN v_result;
EXCEPTION
    WHEN others THEN
        -- Log error and re-raise
        RAISE NOTICE 'Error creating user: %', SQLERRM;
        RAISE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_staff_user TO anon;

-- Add helpful index
CREATE INDEX IF NOT EXISTS idx_staff_signup ON staff(email, email_verified, auth_id)
WHERE email_verified = true AND auth_id IS NULL;

COMMENT ON FUNCTION create_staff_user IS 'Creates a new auth user for verified staff members';

COMMIT;
