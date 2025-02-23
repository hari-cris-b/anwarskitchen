-- Master rebuild script with authentication setup
SET client_min_messages TO notice;
\set ON_ERROR_STOP on

DO $master$
BEGIN 
    RAISE NOTICE 'Starting database rebuild process...';
END $master$;

-- Initial setup
DO $setup$
BEGIN
    -- Revoke all existing permissions
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM public;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM public;
    
    -- Grant schema usage
    GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated;
    
    RAISE NOTICE 'Initial permission setup complete';
END $setup$;

-- Begin transaction
BEGIN;

\echo 'Step 1: Cleanup - Dropping existing tables and types'
\i 'supabase/migrations/20250221_rebuild_database_step1_cleanup.sql'

\echo 'Step 2: Creating core tables'
\i 'supabase/migrations/20250221_rebuild_database_step2_core_tables.sql'

\echo 'Step 3: Creating functions'
\i 'supabase/migrations/20250221_rebuild_database_step3_functions.sql'

\echo 'Step 4: Setting up RLS policies'
\i 'supabase/migrations/20250221_rebuild_database_step4_policies.sql'

\echo 'Step 5: Creating default data'
\i 'supabase/migrations/20250221_rebuild_database_step5_default_data.sql'

\echo 'Step 6: Running authentication and policy tests'
\i 'supabase/migrations/20250221_rebuild_database_step6_test.sql'

\echo 'Step 7: Setting up authentication helpers'
\i 'supabase/migrations/20250221_rebuild_database_step7_auth.sql'

-- Verify final state
DO $verify_final$
DECLARE
    v_super_admin_email text := 'harikrish120027@gmail.com';
    v_staff_email text := 'haricrisb@gmail.com';
    v_auth_id uuid := 'e739b600-aa23-4003-a812-82d9ca747638';
    v_email_exists boolean;
    v_user_type text;
BEGIN
    -- Test as anon role
    SET ROLE anon;
    
    -- Test authentication functions
    SELECT public.check_email_exists(v_super_admin_email) INTO v_email_exists;
    IF NOT v_email_exists THEN
        RAISE EXCEPTION 'Email check failed for super admin';
    END IF;
    
    SELECT public.get_user_type(v_super_admin_email) INTO v_user_type;
    IF v_user_type != 'super_admin' THEN
        RAISE EXCEPTION 'Role check failed for super admin';
    END IF;
    
    -- Test as authenticated role
    SET ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO v_auth_id::text;
    
    -- Verify super admin access
    IF NOT EXISTS (
        SELECT 1 FROM public.super_admin 
        WHERE auth_id = v_auth_id
    ) THEN
        RAISE EXCEPTION 'Super admin cannot access own record';
    END IF;
    
    -- Reset role
    RESET ROLE;
    RESET request.jwt.claim.sub;
    
    RAISE NOTICE 'Final verification passed successfully';
END $verify_final$;

COMMIT;

-- Post-commit setup
DO $post_commit$
BEGIN
    -- Verify final permissions
    RAISE NOTICE 'Verifying final permissions...';
    
    -- Grant permissions to anon role
    GRANT USAGE ON SCHEMA public TO anon;
    GRANT SELECT ON public.super_admin TO anon;
    GRANT SELECT ON public.staff TO anon;
    GRANT EXECUTE ON FUNCTION public.check_email_exists TO anon;
    GRANT EXECUTE ON FUNCTION public.get_user_type TO anon;
    
    -- Grant permissions to authenticated role
    GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
    
    RAISE NOTICE '
        Database rebuild completed successfully:
        - All tables created and verified
        - RLS enabled and policies active
        - Authentication helpers created
        - Permissions properly set
        - Default accounts ready:
          * Super Admin: harikrish120027@gmail.com
          * Staff: haricrisb@gmail.com
        - All tests passed
    ';
END $post_commit$;