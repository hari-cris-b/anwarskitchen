-- Reset any system triggers we accidentally disabled
ALTER TABLE auth.users ENABLE TRIGGER ALL;

-- Update the function signature to work with PostgREST
CREATE OR REPLACE FUNCTION public.can_create_auth_account(p_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Check if email exists in staff and is unlinked
  WITH check_result AS (
    SELECT 
      EXISTS (
        SELECT 1 
        FROM staff 
        WHERE email = p_email 
        AND auth_id IS NULL
        AND email_verified = true
      ) as can_create,
      EXISTS (
        SELECT 1 
        FROM staff 
        WHERE email = p_email
      ) as exists,
      (
        SELECT json_build_object(
          'has_auth_id', auth_id IS NOT NULL,
          'is_verified', email_verified
        )
        FROM staff 
        WHERE email = p_email
      ) as details
  )
  SELECT json_build_object(
    'allowed', can_create,
    'exists', exists,
    'details', details
  )
  INTO v_result
  FROM check_result;

  RETURN COALESCE(v_result, jsonb '{"allowed": false, "exists": false}');
END;
$$;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Allow staff auth linking" ON public.staff;

-- Create simplified policy for staff account linking
CREATE POLICY "Allow staff auth linking"
ON public.staff
FOR UPDATE
USING (
  auth_id IS NULL AND
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  auth_id = auth.uid()
);

-- Recreate link account function with better error handling
CREATE OR REPLACE FUNCTION public.link_staff_account(p_email TEXT, p_auth_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id UUID;
  v_result jsonb;
BEGIN
  -- Get the staff ID first
  SELECT id INTO v_staff_id
  FROM staff 
  WHERE email = p_email;

  -- Check various conditions
  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Staff record not found',
      'code', 'STAFF_NOT_FOUND'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM staff 
    WHERE id = v_staff_id 
    AND auth_id IS NOT NULL 
    AND auth_id != p_auth_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Staff account already linked to another user',
      'code', 'ALREADY_LINKED'
    );
  END IF;

  -- Update staff record
  UPDATE staff 
  SET 
    auth_id = p_auth_id,
    updated_at = NOW()
  WHERE id = v_staff_id
  AND (auth_id IS NULL OR auth_id = p_auth_id);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Staff account linked successfully'
  );
END;
$$;

-- Grant execute permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_auth_account(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_staff_account(TEXT, UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.can_create_auth_account IS 'Checks if an email is eligible for auth account creation';
COMMENT ON FUNCTION public.link_staff_account IS 'Links a staff record to an auth account';
