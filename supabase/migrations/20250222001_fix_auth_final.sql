-- Step 1: Drop existing policies and functions
DO $$ 
DECLARE
  r RECORD;
BEGIN
  -- Drop super admin policies
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'super_admin' 
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.super_admin', r.policyname);
  END LOOP;

  -- Drop staff policies
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'staff' 
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.staff', r.policyname);
  END LOOP;

  -- Drop existing functions
  FOR r IN 
    SELECT proname 
    FROM pg_proc 
    WHERE proname IN ('get_user_profile', 'check_super_admin', 'can_access_profile')
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I CASCADE', r.proname);
  END LOOP;

EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Error during cleanup: %', SQLERRM;
END $$;

-- Step 2: Create unified user profile view
CREATE OR REPLACE VIEW user_profiles AS
WITH profile_union AS (
  -- Super admin profiles
  SELECT 
    auth_id,
    id as profile_id,
    'super_admin'::text as role_type,
    email,
    full_name,
    created_at,
    updated_at,
    NULL::uuid as franchise_id,
    NULL::jsonb as permissions,
    'active'::public.status_type as status,
    true as email_verified
  FROM super_admin
  
  UNION ALL
  
  -- Staff profiles
  SELECT
    auth_id,
    id as profile_id,
    staff_type::text as role_type,
    email,
    full_name,
    created_at,
    updated_at,
    franchise_id,
    permissions,
    status,
    email_verified
  FROM staff
)
SELECT *
FROM profile_union;

-- Step 3: Create secure profile lookup function
CREATE OR REPLACE FUNCTION get_user_profile(p_auth_id uuid)
RETURNS SETOF user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM user_profiles
  WHERE auth_id = p_auth_id
  LIMIT 1;
END;
$$;

-- Step 4: Create base function for profile access
CREATE OR REPLACE FUNCTION can_access_profile(p_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct match or super admin
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE auth_id = auth.uid() 
    AND (
      role_type = 'super_admin' 
      OR auth_id = p_auth_id
    )
  );
END;
$$;

-- Step 5: Reset RLS and create new policies
ALTER TABLE public.super_admin DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;

-- Super admin policies
CREATE POLICY "Allow users to view their own super admin profile"
ON public.super_admin
FOR SELECT
USING (auth_id = auth.uid());

CREATE POLICY "Super admins can manage other super admins"
ON public.super_admin
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE auth_id = auth.uid() 
    AND role_type = 'super_admin'
  )
);

-- Staff policies
CREATE POLICY "Allow users to view their own staff profile"
ON public.staff
FOR SELECT
USING (auth_id = auth.uid());

CREATE POLICY "Super admins can manage staff"
ON public.staff
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE auth_id = auth.uid() 
    AND role_type = 'super_admin'
  )
);

-- Step 6: Grant permissions
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON public.super_admin TO authenticated;
GRANT SELECT ON public.staff TO authenticated;
GRANT UPDATE ON public.super_admin TO authenticated;
GRANT UPDATE ON public.staff TO authenticated;

GRANT EXECUTE ON FUNCTION get_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_profile(uuid) TO authenticated;

-- Step 7: Re-enable RLS
ALTER TABLE public.super_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON VIEW user_profiles IS 'Consolidated view of all user profiles (super admins and staff)';
COMMENT ON FUNCTION get_user_profile IS 'Securely fetch a single user profile by auth_id';
COMMENT ON FUNCTION can_access_profile IS 'Check if current user can access a specific profile';

-- Final cleanup and notice
DO $$ BEGIN
  RAISE NOTICE 'Authentication system update complete. Please clear browser cache and test super admin login.';
END $$;
