    -- Begin transaction
    BEGIN;

    -- Step 1: Fix the super admin role check function
    CREATE OR REPLACE FUNCTION is_super_admin_role()
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM super_admin 
        WHERE auth_id = auth.uid()
    );
    END;
    $$;

    -- Step 2: Add safety check
    DO $$
    DECLARE
    v_user_id uuid;
    v_is_admin boolean;
    BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Test the function
    SELECT is_super_admin_role() INTO v_is_admin;
    
    -- Log result
    RAISE NOTICE 'Testing super admin check for user %: %', v_user_id, v_is_admin;
    END;
    $$;

    -- Step 3: Refresh function grants
    GRANT EXECUTE ON FUNCTION is_super_admin_role() TO authenticated;

    COMMIT;
