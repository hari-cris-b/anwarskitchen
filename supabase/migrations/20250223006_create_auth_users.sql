-- Create auth users for testing
-- Note: Password will be 'Password123!' for both users

-- Function to create auth user
CREATE OR REPLACE FUNCTION create_auth_user(
  p_email text,
  p_password text,
  p_role text DEFAULT 'authenticated'
) RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Insert into auth.users table
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    p_role,
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    format('{"role":"%s"}', p_role)::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create super admin auth user
DO $create_super_admin_auth$
DECLARE
  v_auth_id uuid;
BEGIN
  -- Create auth user
  SELECT create_auth_user(
    'harikrish120027@gmail.com',
    'Password123!',
    'super_admin'
  ) INTO v_auth_id;

  -- Update super_admin record with auth_id
  UPDATE public.super_admin
  SET auth_id = v_auth_id
  WHERE email = 'harikrish120027@gmail.com';
END
$create_super_admin_auth$;

-- Create staff auth user
DO $create_staff_auth$
DECLARE
  v_auth_id uuid;
BEGIN
  -- Create auth user
  SELECT create_auth_user(
    'haricrisb@gmail.com',
    'Password123!',
    'staff'
  ) INTO v_auth_id;

  -- Update staff record with auth_id
  UPDATE public.staff
  SET auth_id = v_auth_id
  WHERE email = 'haricrisb@gmail.com';

  -- Create franchise access for staff
  INSERT INTO public.user_franchise_access (
    auth_id,
    franchise_id,
    role
  )
  SELECT 
    v_auth_id,
    franchise_id,
    staff_type
  FROM public.staff
  WHERE email = 'haricrisb@gmail.com'
  ON CONFLICT (auth_id, franchise_id) DO NOTHING;
END
$create_staff_auth$;

-- Function to verify auth setup
CREATE OR REPLACE FUNCTION verify_auth_setup()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'super_admin_auth', EXISTS (
      SELECT 1 FROM auth.users 
      WHERE email = 'harikrish120027@gmail.com'
    ),
    'staff_auth', EXISTS (
      SELECT 1 FROM auth.users 
      WHERE email = 'haricrisb@gmail.com'
    ),
    'super_admin_linked', EXISTS (
      SELECT 1 FROM public.super_admin
      WHERE email = 'harikrish120027@gmail.com'
      AND auth_id IS NOT NULL
    ),
    'staff_linked', EXISTS (
      SELECT 1 FROM public.staff
      WHERE email = 'haricrisb@gmail.com'
      AND auth_id IS NOT NULL
    ),
    'franchise_access', EXISTS (
      SELECT 1 FROM public.user_franchise_access ufa
      JOIN public.staff s ON s.auth_id = ufa.auth_id
      WHERE s.email = 'haricrisb@gmail.com'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;