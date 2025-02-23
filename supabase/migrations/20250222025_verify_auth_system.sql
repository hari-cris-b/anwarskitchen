BEGIN;

-- First ensure we have admin access
DO $$
BEGIN
    -- Grant necessary permissions to postgres role
    GRANT USAGE ON SCHEMA auth TO postgres;
    GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres;
    GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO postgres;
END $$;

-- Main verification
DO $$
DECLARE
    test_email TEXT := 'test.verify@example.com';
    test_staff_id UUID;
    test_user_id UUID;
    test_result BOOLEAN;
    test_count INT := 0;
    success_count INT := 0;
BEGIN
    -- Initial setup
    SET LOCAL ROLE postgres;
    RAISE NOTICE 'Starting auth system verification...';

    -- Test 1: Create staff member
    test_count := test_count + 1;
    BEGIN
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
            test_email,
            'Test Verify Staff',
            'staff',
            'active',
            true,
            NOW(),
            NOW()
        ) RETURNING id INTO test_staff_id;
        
        success_count := success_count + 1;
        RAISE NOTICE 'Test 1 - Create staff: PASS';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Test 1 - Create staff: FAIL - %', SQLERRM;
    END;

    -- Test 2: Auth account creation
    test_count := test_count + 1;
    BEGIN
        SET LOCAL ROLE service_role;
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
            test_email,
            'test_password_hash',
            NOW(),
            NOW(),
            NOW(),
            jsonb_build_object('role', 'staff'),
            '{}'::jsonb
        ) RETURNING id INTO test_user_id;

        success_count := success_count + 1;
        RAISE NOTICE 'Test 2 - Create auth user: PASS';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Test 2 - Create auth user: FAIL - %', SQLERRM;
    END;

    -- Test 3: Staff account linking
    test_count := test_count + 1;
    BEGIN
        SET LOCAL ROLE postgres;
        UPDATE staff 
        SET auth_id = test_user_id,
            updated_at = NOW()
        WHERE id = test_staff_id;

        IF FOUND THEN
            success_count := success_count + 1;
            RAISE NOTICE 'Test 3 - Link staff account: PASS';
        ELSE
            RAISE EXCEPTION 'Failed to link staff account';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Test 3 - Link staff account: FAIL - %', SQLERRM;
    END;

    -- Test 4: Verify auth bypass for service role
    test_count := test_count + 1;
    BEGIN
        SET LOCAL ROLE service_role;
        SELECT auth.bypass_rls() INTO test_result;
        
        IF test_result THEN
            success_count := success_count + 1;
            RAISE NOTICE 'Test 4 - Service role bypass: PASS';
        ELSE
            RAISE EXCEPTION 'Service role cannot bypass RLS';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Test 4 - Service role bypass: FAIL - %', SQLERRM;
    END;

    -- Test 5: Verify user access
    test_count := test_count + 1;
    BEGIN
        SET LOCAL ROLE postgres;
        PERFORM set_config('request.jwt.claims', 
            format('{"sub": "%s", "role": "authenticated"}', test_user_id),
            true
        );

        IF EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = test_user_id 
            AND email = test_email
        ) THEN
            success_count := success_count + 1;
            RAISE NOTICE 'Test 5 - User access: PASS';
        ELSE
            RAISE EXCEPTION 'Cannot access user record';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Test 5 - User access: FAIL - %', SQLERRM;
    END;

    -- Test 6: Verify final state
    test_count := test_count + 1;
    BEGIN
        SET LOCAL ROLE postgres;
        
        IF EXISTS (
            SELECT 1 
            FROM staff s
            JOIN auth.users u ON s.auth_id = u.id
            WHERE s.email = test_email
            AND s.auth_id = test_user_id
            AND u.email = test_email
        ) THEN
            success_count := success_count + 1;
            RAISE NOTICE 'Test 6 - Final state: PASS';
        ELSE
            RAISE EXCEPTION 'Invalid final state';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Test 6 - Final state: FAIL - %', SQLERRM;
    END;

    -- Cleanup
    RESET ROLE;
    DELETE FROM auth.users WHERE id = test_user_id;
    DELETE FROM staff WHERE id = test_staff_id;

    -- Final summary
    RAISE NOTICE 'Verification summary: % of % tests passed', success_count, test_count;
    
    IF success_count = test_count THEN
        RAISE NOTICE 'All verification tests passed successfully!';
    ELSE
        RAISE EXCEPTION '% tests failed', test_count - success_count;
    END IF;

EXCEPTION WHEN OTHERS THEN
    -- Emergency cleanup
    RESET ROLE;
    
    BEGIN
        DELETE FROM auth.users WHERE email = test_email;
        DELETE FROM staff WHERE email = test_email;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    RAISE EXCEPTION 'Verification failed: %', SQLERRM;
END $$;

-- Cleanup grants
DO $$
BEGIN
    -- Restore normal permissions
    REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM postgres;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA auth FROM postgres;
    REVOKE ALL ON ALL ROUTINES IN SCHEMA auth FROM postgres;
END $$;

COMMIT;
