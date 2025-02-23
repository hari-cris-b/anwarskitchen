-- Begin transaction
BEGIN;

-- Drop existing super admin select policy
DROP POLICY IF EXISTS "Allow reading super admin records during auth" ON super_admin;

-- Create more comprehensive policy for super admin authentication
CREATE POLICY "Allow super admin access during auth" ON super_admin
    FOR SELECT
    USING (
        -- Allow during authentication for any authenticated user
        -- Profile loading will filter invalid access later
        auth.uid() IS NOT NULL
    );

-- Helper function to safely check super admin status
CREATE OR REPLACE FUNCTION is_valid_super_admin(check_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM super_admin
        WHERE auth_id = check_auth_id
        AND auth_id IS NOT NULL
    );
END;
$$;

-- Create strict policy for modifications
CREATE POLICY "Super admin can modify records" ON super_admin
    FOR ALL
    USING (is_valid_super_admin(auth.uid()))
    WITH CHECK (is_valid_super_admin(auth.uid()));

-- Add helpful comments
COMMENT ON POLICY "Allow super admin access during auth" ON super_admin IS 
'Allows profile loading during authentication while maintaining security';

COMMENT ON FUNCTION is_valid_super_admin(uuid) IS
'Safely checks if a user is a valid super admin';

COMMIT;