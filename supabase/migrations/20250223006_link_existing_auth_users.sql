-- Link existing auth users to staff and super admin records

-- Super admin linkage
DO $link_super_admin$
DECLARE
  v_auth_id uuid := 'e739b600-aa23-4003-a812-82d9ca747638';  -- Existing auth user ID
BEGIN
  -- Update super admin record with existing auth ID
  UPDATE public.super_admin
  SET auth_id = v_auth_id
  WHERE email = 'harikrish120027@gmail.com'
  AND auth_id IS NULL;

  -- Log the linkage
  INSERT INTO public.super_admin_activity (
    super_admin_id,
    action_type,
    action_details
  )
  SELECT 
    id,
    'account_linked',
    jsonb_build_object(
      'auth_id', v_auth_id,
      'email', email,
      'timestamp', now()
    )
  FROM public.super_admin
  WHERE auth_id = v_auth_id;
END
$link_super_admin$;

-- Staff linkage
DO $link_staff$
DECLARE
  v_auth_id uuid := 'cdb33d22-f103-4a4d-8603-e6be28c072b5';  -- Existing auth user ID
  v_staff_id uuid;
BEGIN
  -- Update staff record with existing auth ID
  UPDATE public.staff
  SET 
    auth_id = v_auth_id,
    email_verified = true
  WHERE email = 'haricrisb@gmail.com'
  AND auth_id IS NULL
  RETURNING id INTO v_staff_id;

  -- Create franchise access
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
  WHERE id = v_staff_id
  ON CONFLICT (auth_id, franchise_id) DO NOTHING;

  -- Log the linkage
  INSERT INTO public.staff_activity (
    staff_id,
    action_type,
    action_details
  )
  VALUES (
    v_staff_id,
    'account_linked',
    jsonb_build_object(
      'auth_id', v_auth_id,
      'email', 'haricrisb@gmail.com',
      'timestamp', now()
    )
  );
END
$link_staff$;

-- Verify the linkage
SELECT 
  jsonb_build_object(
    'super_admin_linked', (
      SELECT jsonb_build_object(
        'email', email,
        'auth_id', auth_id,
        'has_activities', EXISTS (
          SELECT 1 FROM public.super_admin_activity 
          WHERE super_admin_id = id
        )
      )
      FROM public.super_admin 
      WHERE email = 'harikrish120027@gmail.com'
    ),
    'staff_linked', (
      SELECT jsonb_build_object(
        'email', email,
        'auth_id', auth_id,
        'has_activities', EXISTS (
          SELECT 1 FROM public.staff_activity 
          WHERE staff_id = id
        ),
        'has_franchise_access', EXISTS (
          SELECT 1 FROM public.user_franchise_access 
          WHERE auth_id = staff.auth_id
        )
      )
      FROM public.staff 
      WHERE email = 'haricrisb@gmail.com'
    )
  );