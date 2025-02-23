BEGIN;

-- Grant temporary admin access for testing
DO $$
BEGIN
    -- Make sure postgres has full access
    GRANT USAGE ON SCHEMA auth TO postgres;
    GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres;
    GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO postgres;
END $$;

-- Main test function
DO $$
DECLARE
    _role text;
    _test_email text := 'test.staff13@example.com';
    _test_staff_id uuid;
    _test_user_id uuid;
BEGIN
    RAISE NOTICE 'Starting auth system test...';

    -- Create test staff member
    INSERT INTO staff (
        id,
        email,
        full_name,
        staff_type,
        status,
        email_verified,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        _test_email,
        'Test Staff 13',
        'staff',
        'active',
        true,
        NOW(),
        NOW()
    ) RETURNING id INTO _test_staff_id;

    RAISE NOTICE 'Created test staff member with ID: %', _test_staff_id;

    -- Test as service role
    SET LOCAL ROLE service_role;
    RAISE NOTICE 'Testing as service_role - bypass_rls: %', auth.bypass_rls();
    
    -- Create test auth user
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data
    ) VALUES (
        gen_random_uuid(),
        _test_email,
        'test_hash',
        NOW(),
        NOW(),
        NOW(),
        jsonb_build_object('role', 'staff'),
        '{}'::jsonb
    ) RETURNING id INTO _test_user_id;

    RAISE NOTICE 'Created test auth user with ID: %', _test_user_id;

    -- Test staff linking
    SET LOCAL ROLE postgres;
    UPDATE staff 
    SET auth_id = _test_user_id 
    WHERE id = _test_staff_id;

    -- Verify final state
    ASSERT EXISTS (
        SELECT 1 FROM staff s
        JOIN auth.users u ON s.auth_id = u.id
        WHERE s.email = _test_email
        AND s.id = _test_staff_id
        AND s.auth_id = _test_user_id
    ), 'Staff record not properly linked';

    -- Clean up test data
    DELETE FROM auth.users WHERE id = _test_user_id;
    DELETE FROM staff WHERE id = _test_staff_id;
    
    -- Reset role
    RESET ROLE;
    
    RAISE NOTICE 'Auth system test completed successfully!';

EXCEPTION WHEN OTHERS THEN
    -- Clean up on error
    RESET ROLE;
    
    BEGIN
        DELETE FROM auth.users WHERE email = _test_email;
        DELETE FROM staff WHERE email = _test_email;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore cleanup errors
        NULL;
    END;
    
    RAISE EXCEPTION 'Test failed: %', SQLERRM;
END;
$$;

COMMIT;
