-- Drop existing problematic policies
DO $$ 
BEGIN
  -- Drop super admin policies
  EXECUTE (
    SELECT string_agg(
      format('DROP POLICY IF EXISTS %I ON public.super_admin;', policyname),
      E'\n'
    )
    FROM pg_policies 
    WHERE tablename = 'super_admin' 
    AND schemaname = 'public'
  );

  -- Drop staff policies
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
    RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- Create user profile view
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

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_user_profile(uuid);

-- Create secure function to get single profile
CREATE FUNCTION get_user_profile(p_auth_id uuid)
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

-- Create policies for super_admin table
CREATE POLICY "Allow users to view their own super admin profile"
ON public.super_admin
FOR SELECT
USING (
  auth_id = auth.uid()
);

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

-- Create policies for staff table
CREATE POLICY "Allow users to view their own staff profile"
ON public.staff
FOR SELECT
USING (
  auth_id = auth.uid()
);

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

-- Grant permissions
GRANT SELECT ON user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile(uuid) TO authenticated;

-- Add helpful comments
COMMENT ON VIEW user_profiles IS 'Consolidated view of all user profiles (super admins and staff)';
COMMENT ON FUNCTION get_user_profile IS 'Securely fetch a single user profile by auth_id';
