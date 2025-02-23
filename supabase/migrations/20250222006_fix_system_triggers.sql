-- Remove attempts to modify system triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auth_user_created();

-- Update the creation check function
CREATE OR REPLACE FUNCTION public.can_create_auth_account(p_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Check if email exists in auth.users
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE email = p_email
  ) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'exists', true,
      'details', jsonb_build_object(
        'has_auth_id', true,
        'is_verified', true
      ),
      'code', 'AUTH_EXISTS'
    );
  END IF;

  -- Check staff eligibility
  WITH staff_check AS (
    SELECT 
      EXISTS (
        SELECT 1 
        FROM staff 
        WHERE email = p_email
      ) as exists,
      (
        SELECT jsonb_build_object(
          'has_auth_id', auth_id IS NOT NULL,
          'is_verified', email_verified
        )
        FROM staff 
        WHERE email = p_email
      ) as details,
      EXISTS (
        SELECT 1 
        FROM staff 
        WHERE email = p_email 
        AND auth_id IS NULL
        AND email_verified = true
      ) as is_eligible
  )
  SELECT jsonb_build_object(
    'allowed', is_eligible,
    'exists', exists,
    'details', details,
    'code', CASE 
      WHEN NOT exists THEN 'NOT_FOUND'
      WHEN NOT is_eligible THEN 'NOT_ELIGIBLE'
      ELSE 'OK'
    END
  )
  INTO v_result
  FROM staff_check;

  RETURN v_result;
END;
$$;

-- Update link account function to be more robust
CREATE OR REPLACE FUNCTION public.link_staff_account(p_email TEXT, p_auth_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_record staff;
BEGIN
  -- Get staff record with locking
  SELECT * INTO v_staff_record
  FROM staff 
  WHERE email = p_email
  FOR UPDATE;

  -- Various checks
  IF v_staff_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Staff record not found',
      'code', 'STAFF_NOT_FOUND'
    );
  END IF;

  IF v_staff_record.auth_id IS NOT NULL AND v_staff_record.auth_id != p_auth_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Staff account already linked to another user',
      'code', 'ALREADY_LINKED'
    );
  END IF;

  IF NOT v_staff_record.email_verified THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Staff email must be verified first',
      'code', 'NOT_VERIFIED'
    );
  END IF;

  -- Update the record
  UPDATE staff 
  SET 
    auth_id = p_auth_id,
    updated_at = NOW()
  WHERE id = v_staff_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Staff account linked successfully',
    'code', 'OK'
  );
END;
$$;

-- Reapply permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_auth_account(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_staff_account(TEXT, UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.can_create_auth_account IS 'Checks if an email is eligible for auth account creation';
COMMENT ON FUNCTION public.link_staff_account IS 'Links a staff record to an auth account';
