-- Reset auth trigger and policies
ALTER TABLE auth.users DISABLE TRIGGER ALL;
DROP POLICY IF EXISTS "Allow public access" ON auth.users;

-- Ensure service role has proper access
GRANT USAGE ON SCHEMA auth TO service_role, postgres;
GRANT ALL ON auth.users TO service_role, postgres;

-- Simplify staff auth verification
CREATE OR REPLACE FUNCTION public.verify_staff_registration(p_email TEXT, p_auth_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_record staff;
  v_result jsonb;
BEGIN
  -- Check if email exists in auth.users (when not linking)
  IF p_auth_id IS NULL AND EXISTS (
    SELECT 1 FROM auth.users WHERE email = p_email
  ) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'message', 'An account already exists for this email'
    );
  END IF;

  -- Get staff record
  SELECT * INTO v_staff_record
  FROM staff 
  WHERE email = p_email;

  -- Check various conditions
  IF v_staff_record IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'message', 'No staff record found for this email'
    );
  END IF;

  IF v_staff_record.auth_id IS NOT NULL AND (p_auth_id IS NULL OR v_staff_record.auth_id != p_auth_id) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'message', 'Staff account already has a user linked to it'
    );
  END IF;

  IF NOT v_staff_record.email_verified THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'message', 'Staff email must be verified first'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'message', 'Staff can proceed with account creation'
  );
END;
$$;

-- Create atomic linking function
CREATE OR REPLACE FUNCTION public.link_staff_account(p_email TEXT, p_auth_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verification jsonb;
BEGIN
  -- First verify the linking is allowed
  v_verification := verify_staff_registration(p_email, p_auth_id);
  
  IF NOT (v_verification->>'allowed')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', v_verification->>'message'
    );
  END IF;

  -- Update staff record
  UPDATE staff 
  SET 
    auth_id = p_auth_id,
    updated_at = NOW()
  WHERE email = p_email
  AND (auth_id IS NULL OR auth_id = p_auth_id);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Staff account linked successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.verify_staff_registration(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_staff_registration(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_staff_account(TEXT, UUID) TO authenticated;

-- Re-enable auth triggers
ALTER TABLE auth.users ENABLE TRIGGER ALL;

-- Add helpful comments
COMMENT ON FUNCTION public.verify_staff_registration(TEXT, UUID) IS 'Checks if staff member can be linked to auth account';
COMMENT ON FUNCTION public.verify_staff_registration(TEXT) IS 'Checks if staff member can create auth account';
COMMENT ON FUNCTION public.link_staff_account IS 'Links staff record to auth account safely';
