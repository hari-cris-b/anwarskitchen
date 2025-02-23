-- Drop all existing super admin policies and functions
DO $$ 
BEGIN
  -- Drop all policies on super_admin table
  -- This ensures we remove all dependencies on check_super_admin function
  EXECUTE (
    SELECT string_agg(
      format('DROP POLICY IF EXISTS %I ON public.super_admin;', policyname),
      E'\n'
    )
    FROM pg_policies 
    WHERE tablename = 'super_admin' 
    AND schemaname = 'public'
  );

  -- Now we can safely drop the function
  DROP FUNCTION IF EXISTS check_super_admin(uuid);
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping policies/functions: %', SQLERRM;
END $$;

-- Ensure all policies are removed
DROP POLICY IF EXISTS "Super admins can view all super admin records" ON public.super_admin;
DROP POLICY IF EXISTS "Super admins can add new super admins" ON public.super_admin;
DROP POLICY IF EXISTS "Super admins can update super admin records" ON public.super_admin;
DROP POLICY IF EXISTS "Super admins can delete super admin records" ON public.super_admin;
DROP POLICY IF EXISTS "Allow auth_id update for unlinked super admin" ON public.super_admin;

-- Create a more efficient user type checking function
CREATE OR REPLACE FUNCTION get_user_type(p_auth_id uuid)
RETURNS TABLE (
  user_type text,
  user_id uuid,
  email text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First check super_admin table
  RETURN QUERY
  SELECT 
    'super_admin'::text as user_type,
    sa.id as user_id,
    sa.email
  FROM super_admin sa
  WHERE sa.auth_id = p_auth_id;

  -- If no super_admin found, check staff table
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'staff'::text as user_type,
      s.id as user_id,
      s.email
    FROM staff s
    WHERE s.auth_id = p_auth_id;
  END IF;
END;
$$;

-- Create a secure function to check if user is super admin
CREATE OR REPLACE FUNCTION check_super_admin(check_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM get_user_type(check_auth_id) 
    WHERE user_type = 'super_admin'
  );
END;
$$;

-- Disable RLS temporarily
ALTER TABLE public.super_admin DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;

-- Create base policies using the new functions
CREATE POLICY "Allow users to view their own profile"
ON public.super_admin
FOR SELECT
USING (
  auth_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM get_user_type(auth.uid())
    WHERE user_type = 'super_admin'
  )
);

CREATE POLICY "Super admins can manage other super admins"
ON public.super_admin
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM get_user_type(auth.uid())
    WHERE user_type = 'super_admin'
  )
);

CREATE POLICY "Allow email matched users to link auth_id"
ON public.super_admin
FOR UPDATE
USING (
  auth_id IS NULL AND
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  auth_id IS NOT NULL AND
  email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND
  (
    SELECT email FROM super_admin WHERE id = id
  ) = email AND
  (
    SELECT full_name FROM super_admin WHERE id = id
  ) = full_name AND
  (
    SELECT created_at FROM super_admin WHERE id = id
  ) = created_at
);

-- Drop any existing staff policies
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg(
      format('DROP POLICY IF EXISTS %I ON public.staff;', policyname),
      E'\n'
    )
    FROM pg_policies 
    WHERE tablename = 'staff' 
    AND schemaname = 'public'
  );
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping staff policies: %', SQLERRM;
END $$;

-- Create base function for profile access
CREATE OR REPLACE FUNCTION can_access_profile(p_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct match or super admin
  RETURN EXISTS (
    SELECT 1 FROM get_user_type(auth.uid()) 
    WHERE user_type = 'super_admin' 
    OR (user_type = 'staff' AND user_id = p_auth_id)
  );
END;
$$;

-- Create function to safely get staff profile
CREATE OR REPLACE FUNCTION get_staff_profile(p_auth_id uuid)
RETURNS SETOF staff
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.*
  FROM staff s
  WHERE s.auth_id = p_auth_id;
END;
$$;

-- Create secure staff access policies
CREATE POLICY "Allow staff to view own profile"
ON public.staff
FOR SELECT
USING (
  auth_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM get_user_type(auth.uid())
    WHERE user_type = 'super_admin'
  )
);

CREATE POLICY "Super admins can manage staff"
ON public.staff
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM get_user_type(auth.uid())
    WHERE user_type = 'super_admin'
  )
);

-- Grant execute permission for the new function
GRANT EXECUTE ON FUNCTION get_staff_profile(uuid) TO authenticated;

-- Give function execute permissions
GRANT EXECUTE ON FUNCTION can_access_profile(uuid) TO authenticated;

-- Ensure proper table permissions
GRANT SELECT ON public.super_admin TO authenticated;
GRANT SELECT ON public.staff TO authenticated;
GRANT UPDATE ON public.super_admin TO authenticated;
GRANT UPDATE ON public.staff TO authenticated;

-- Re-enable RLS with proper default deny
ALTER TABLE public.super_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Grant necessary function permissions
GRANT EXECUTE ON FUNCTION get_user_type(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_profile(uuid) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_user_type IS 'Efficiently determines user type and ID without recursive RLS checks';
COMMENT ON FUNCTION check_super_admin IS 'Securely checks if a user is a super admin using get_user_type';
COMMENT ON FUNCTION can_access_profile IS 'Checks if a user can access a specific profile';
