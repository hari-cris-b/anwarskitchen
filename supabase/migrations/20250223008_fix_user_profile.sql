-- Drop existing function first
DROP FUNCTION IF EXISTS get_user_profile(uuid);

-- Create new get_user_profile function with proper role handling
CREATE OR REPLACE FUNCTION get_user_profile(p_auth_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  is_super boolean;
BEGIN
  -- Check if user is super admin first
  SELECT EXISTS (
    SELECT 1 FROM public.super_admin WHERE auth_id = p_auth_id
  ) INTO is_super;

  IF is_super THEN
    -- Return super admin profile
    SELECT jsonb_build_object(
      'auth_id', sa.auth_id,
      'profile_id', sa.id,
      'email', sa.email,
      'full_name', sa.full_name,
      'role_type', 'super_admin',
      'email_verified', true,
      'permissions', jsonb_build_object(
        'can_access_pos', false,
        'can_access_kitchen', false,
        'can_access_reports', true,
        'can_manage_menu', true,
        'can_manage_staff', true
      ),
      'created_at', sa.created_at,
      'updated_at', sa.updated_at
    )
    INTO result
    FROM public.super_admin sa
    WHERE sa.auth_id = p_auth_id;

  ELSE
    -- Return staff profile
    SELECT jsonb_build_object(
      'auth_id', s.auth_id,
      'profile_id', s.id,
      'email', s.email,
      'full_name', s.full_name,
      'franchise_id', s.franchise_id,
      'role_type', s.staff_type,
      'email_verified', s.email_verified,
      'permissions', s.permissions,
      'pin_code', s.pin_code,
      'status', s.status,
      'phone', s.phone,
      'shift', s.shift,
      'hourly_rate', s.hourly_rate,
      'joining_date', s.joining_date,
      'created_at', s.created_at,
      'updated_at', s.updated_at
    )
    INTO result
    FROM public.staff s
    WHERE s.auth_id = p_auth_id
    AND s.status = 'active';
  END IF;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test function
DO $$
BEGIN
  -- Test super admin profile
  ASSERT (SELECT (get_user_profile('e739b600-aa23-4003-a812-82d9ca747638')->>'role_type') = 'super_admin'), 
    'Super admin profile not returning correctly';

  -- Test staff profile
  ASSERT (SELECT (get_user_profile('cdb33d22-f103-4a4d-8603-e6be28c072b5')->>'role_type') = 'admin'),
    'Staff profile not returning correctly';
END $$;

-- Ensure proper metadata in auth.users
UPDATE auth.users
SET 
  raw_user_meta_data = jsonb_build_object(
    'role', 
    CASE 
      WHEN id = 'e739b600-aa23-4003-a812-82d9ca747638' THEN 'super_admin'
      ELSE 'staff'
    END,
    'email', email,
    'email_verified', true,
    'phone_verified', false
  ),
  raw_app_meta_data = jsonb_build_object(
    'provider', 'email',
    'providers', ARRAY['email']
  )
WHERE id IN (
  'e739b600-aa23-4003-a812-82d9ca747638',
  'cdb33d22-f103-4a4d-8603-e6be28c072b5'
);