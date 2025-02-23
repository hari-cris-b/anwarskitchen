-- Add logging for debugging JWT token contents
-- Begin transaction
CREATE OR REPLACE FUNCTION log_jwt_contents() RETURNS void AS $$
BEGIN;
DECLARE

    jwt_token text;
-- Drop existing policies
BEGIN
DROP POLICY IF EXISTS "Staff can view own franchise settings" ON franchise_settings;
    jwt_token := auth.jwt();
DROP POLICY IF EXISTS "Admins can update own franchise settings" ON franchise_settings;
    RAISE NOTICE 'JWT Token: %', jwt_token;
DROP POLICY IF EXISTS "Super admins can view franchise settings" ON franchise_settings;
END;
DROP POLICY IF EXISTS "Super admins can manage franchise settings" ON franchise_settings;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Create function to safely check franchise_id from JWT
-- Call the logging function in the check_franchise_access function
CREATE OR REPLACE FUNCTION check_franchise_access(required_franchise_id uuid)
CREATE OR REPLACE FUNCTION check_franchise_access(required_franchise_id uuid)
RETURNS boolean AS $$
RETURNS boolean AS $$
DECLARE
DECLARE
    jwt_franchise_id text;
    jwt_franchise_id text;
    is_super_admin boolean;
    is_super_admin boolean;
BEGIN
BEGIN
    -- Get franchise_id from JWT
    -- Log JWT contents
    jwt_franchise_id := auth.jwt() ->> 'franchise_id';
    PERFORM log_jwt_contents();
    

    -- Check for super admin first
    -- Get franchise_id from JWT
    is_super_admin := coalesce(auth.jwt() ->> 'is_super_admin', 'false')::boolean;
    jwt_franchise_id := auth.jwt() ->> 'franchise_id';
    IF is_super_admin THEN

        RETURN true;
    -- Check for super admin first
    END IF;
    is_super_admin := coalesce(auth.jwt() ->> 'is_super_admin', 'false')::boolean;

    IF is_super_admin THEN
    -- Validate franchise_id is present
        RETURN true;
    IF jwt_franchise_id IS NULL THEN
    END IF;
        RAISE EXCEPTION 'No franchise_id found in JWT token';

    END IF;
    -- Validate franchise_id is present

    IF jwt_franchise_id IS NULL THEN
    -- Attempt to cast and compare
        RAISE EXCEPTION 'No franchise_id found in JWT token';
    BEGIN
    END IF;
        RETURN required_franchise_id = jwt_franchise_id::uuid;

    EXCEPTION WHEN OTHERS THEN
    -- Attempt to cast and compare
        RAISE EXCEPTION 'Invalid franchise_id format in JWT token';
    BEGIN
    END;
        RETURN required_franchise_id = jwt_franchise_id::uuid;
END;
    EXCEPTION WHEN OTHERS THEN
$$ LANGUAGE plpgsql SECURITY DEFINER;
        RAISE EXCEPTION 'Invalid franchise_id format in JWT token';

    END;
-- Create new policies with better error handling
END;
CREATE POLICY "Staff can view own franchise settings" ON franchise_settings
$$ LANGUAGE plpgsql SECURITY DEFINER;
    FOR SELECT
    USING (check_franchise_access(franchise_id));

CREATE POLICY "Admins can update own franchise settings" ON franchise_settings
    FOR UPDATE
    USING (check_franchise_access(franchise_id))
    WITH CHECK (check_franchise_access(franchise_id));

CREATE POLICY "Super admins can view franchise settings" ON franchise_settings
    FOR SELECT
    USING (is_super_admin_role());

CREATE POLICY "Super admins can manage franchise settings" ON franchise_settings
    FOR ALL
    USING (is_super_admin_role());

COMMIT;