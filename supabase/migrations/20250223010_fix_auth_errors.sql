-- Fix ambiguous id column in get_user_role
CREATE OR REPLACE FUNCTION get_user_role(check_auth_id uuid)
RETURNS TABLE (
  role_type text,
  id uuid,
  is_super_admin boolean
) AS $$
BEGIN
  -- First check super admin
  IF EXISTS (
    SELECT 1 FROM public.super_admin 
    WHERE auth_id = check_auth_id
  ) THEN
    RETURN QUERY
    SELECT 
      'super_admin'::text,
      sa.id,
      true
    FROM public.super_admin sa
    WHERE sa.auth_id = check_auth_id;
    RETURN;
  END IF;

  -- Then check staff
  RETURN QUERY
  SELECT 
    s.staff_type::text,
    s.id,
    s.staff_type = 'super_admin'::staff_role
  FROM public.staff s
  WHERE s.auth_id = check_auth_id
  AND s.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix auth credentials by ensuring proper raw_user_meta_data
UPDATE auth.users
SET 
  role = 'authenticated',
  raw_app_meta_data = jsonb_build_object(
    'provider', 'email',
    'providers', ARRAY['email']
  ),
  raw_user_meta_data = 
    CASE 
      WHEN id = 'e739b600-aa23-4003-a812-82d9ca747638' THEN
        jsonb_build_object(
          'role', 'super_admin',
          'email', email,
          'email_verified', true,
          'phone_verified', false,
          'can_access_admin', true
        )
      ELSE
        jsonb_build_object(
          'role', 'staff',
          'email', email,
          'email_verified', true,
          'phone_verified', false,
          'can_access_pos', true
        )
    END,
  encrypted_password = crypt('Password123!', gen_salt('bf')),
  email_confirmed_at = now(),
  last_sign_in_at = now(),
  updated_at = now()
WHERE id IN (
  'e739b600-aa23-4003-a812-82d9ca747638',  -- super admin
  'cdb33d22-f103-4a4d-8603-e6be28c072b5'   -- staff
);

-- Ensure proper auth.users settings
ALTER TABLE auth.users 
  ALTER COLUMN raw_app_meta_data SET DEFAULT '{"provider": "email", "providers": ["email"]}'::jsonb,
  ALTER COLUMN raw_user_meta_data SET DEFAULT '{"email_verified": false, "phone_verified": false}'::jsonb;

-- Verify setup
DO $$
DECLARE
  v_super_admin record;
  v_staff record;
BEGIN
  -- Check super admin
  SELECT * INTO v_super_admin 
  FROM auth.users 
  WHERE id = 'e739b600-aa23-4003-a812-82d9ca747638';
  
  ASSERT v_super_admin.raw_user_meta_data->>'role' = 'super_admin', 
    'Super admin role metadata incorrect';
  ASSERT v_super_admin.raw_user_meta_data->>'email_verified' = 'true',
    'Super admin email verification incorrect';
  ASSERT v_super_admin.email_confirmed_at IS NOT NULL,
    'Super admin email confirmation missing';

  -- Check staff
  SELECT * INTO v_staff 
  FROM auth.users 
  WHERE id = 'cdb33d22-f103-4a4d-8603-e6be28c072b5';
  
  ASSERT v_staff.raw_user_meta_data->>'role' = 'staff',
    'Staff role metadata incorrect';
  ASSERT v_staff.raw_user_meta_data->>'email_verified' = 'true',
    'Staff email verification incorrect';
  ASSERT v_staff.email_confirmed_at IS NOT NULL,
    'Staff email confirmation missing';

  -- Verify user_role function
  ASSERT (SELECT is_super_admin FROM get_user_role('e739b600-aa23-4003-a812-82d9ca747638') LIMIT 1) = true,
    'get_user_role super admin check failed';
  ASSERT (SELECT role_type FROM get_user_role('cdb33d22-f103-4a4d-8603-e6be28c072b5') LIMIT 1) = 'admin',
    'get_user_role staff check failed';
END $$;