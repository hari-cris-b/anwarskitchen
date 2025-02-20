-- Create extension in its own transaction
BEGIN;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
COMMIT;

-- Begin main transaction
BEGIN;

-- Function to create test user in auth schema
CREATE OR REPLACE FUNCTION create_auth_user(
    p_email text,
    p_password text DEFAULT 'password123'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth
AS $$
DECLARE 
    v_user_id uuid;
    v_encrypted_pw text;
BEGIN
    -- Generate encrypted password
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- Create user in auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        v_encrypted_pw,
        now(),
        now(),
        now(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('is_super_admin', true),
        now(),
        now(),
        encode(digest(gen_random_uuid()::text, 'sha256'), 'hex'),
        p_email,
        encode(digest(gen_random_uuid()::text, 'sha256'), 'hex'),
        encode(digest(gen_random_uuid()::text, 'sha256'), 'hex')
    )
    RETURNING id INTO v_user_id;

    RETURN v_user_id;
END;
$$;

-- Function to set up complete super admin account
CREATE OR REPLACE FUNCTION setup_test_super_admin(
    p_email text DEFAULT 'admin@ak.com',
    p_full_name text DEFAULT 'System Administrator',
    p_password text DEFAULT 'password123'
)
RETURNS TABLE (
    step text,
    status text,
    details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth_id uuid;
    v_super_admin_id uuid;
BEGIN
    -- Step 1: Create auth user if not exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        v_auth_id := create_auth_user(p_email, p_password);
        
        RETURN QUERY SELECT 
            'create_auth_user'::text,
            'success'::text,
            jsonb_build_object('auth_id', v_auth_id);
    ELSE
        SELECT id INTO v_auth_id FROM auth.users WHERE email = p_email;
        
        RETURN QUERY SELECT 
            'check_auth_user'::text,
            'exists'::text,
            jsonb_build_object('auth_id', v_auth_id);
    END IF;

    -- Step 2: Create super admin if not exists
    IF NOT EXISTS (SELECT 1 FROM super_admin WHERE email = p_email) THEN
        INSERT INTO super_admin (
            email,
            full_name,
            auth_id
        ) VALUES (
            p_email,
            p_full_name,
            v_auth_id
        )
        RETURNING id INTO v_super_admin_id;

        RETURN QUERY SELECT 
            'create_super_admin'::text,
            'success'::text,
            jsonb_build_object('id', v_super_admin_id);
    ELSE
        SELECT id INTO v_super_admin_id FROM super_admin WHERE email = p_email;
        
        -- Update auth_id if not set
        UPDATE super_admin 
        SET auth_id = v_auth_id
        WHERE id = v_super_admin_id
        AND (auth_id IS NULL OR auth_id != v_auth_id);

        RETURN QUERY SELECT 
            'update_super_admin'::text,
            'success'::text,
            jsonb_build_object(
                'id', v_super_admin_id,
                'auth_id', v_auth_id
            );
    END IF;

    -- Step 3: Verify setup
    RETURN QUERY SELECT 
        'verify_setup'::text,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM get_user_role(v_auth_id)
                WHERE role_type = 'super_admin'
                AND is_super_admin = true
            ) THEN 'success'
            ELSE 'failed'
        END::text,
        jsonb_build_object(
            'auth_id', v_auth_id,
            'super_admin_id', v_super_admin_id
        );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_auth_user(text, text) TO postgres;
GRANT EXECUTE ON FUNCTION setup_test_super_admin(text, text, text) TO postgres;

-- Create test super admin with diagnostic output
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN SELECT * FROM setup_test_super_admin() LOOP
        RAISE NOTICE 'Step: %, Status: %, Details: %', r.step, r.status, r.details;
    END LOOP;
END;
$$;

-- Verify final setup
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN SELECT * FROM verify_super_admin_setup(auth.uid()) LOOP
        RAISE NOTICE 'Check: %, Status: %, Details: %', r.check_type, r.status, r.details;
    END LOOP;
END;
$$;

COMMIT;