-- Reset everything first
DROP TRIGGER IF EXISTS validate_new_user_insert ON auth.users;
DROP FUNCTION IF EXISTS auth.validate_new_user() CASCADE;
DROP FUNCTION IF EXISTS auth.check_staff_registration(text) CASCADE;
DROP FUNCTION IF EXISTS public.can_create_auth_account(text) CASCADE;
DROP FUNCTION IF EXISTS public.link_staff_account(text, uuid) CASCADE;

-- Disable RLS temporarily for cleanup
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;

-- Function to check if staff can create account
CREATE OR REPLACE FUNCTION public.verify_staff_registration(
  p_email TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_record staff;
BEGIN
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

  IF v_staff_record.auth_id IS NOT NULL THEN
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
    'message', 'Staff can create account'
  );
END;
$$;

-- Function to link staff account
CREATE OR REPLACE FUNCTION public.link_staff_account(
  p_email TEXT,
  p_auth_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_record staff;
  v_result jsonb;
BEGIN
  -- Get staff record with lock
  SELECT * INTO v_staff_record
  FROM staff 
  WHERE email = p_email
  FOR UPDATE;

  -- Recheck conditions
  IF v_staff_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Staff record not found'
    );
  END IF;

  IF v_staff_record.auth_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Staff account already linked'
    );
  END IF;

  -- Update staff record
  UPDATE staff 
  SET 
    auth_id = p_auth_id,
    updated_at = NOW()
  WHERE id = v_staff_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Staff account linked successfully'
  );
END;
$$;

-- Enable RLS and create policies
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Policy for staff self-management
CREATE POLICY "Staff can update their own auth_id"
ON public.staff
FOR UPDATE
USING (
  -- Only allow updating unlinked accounts
  auth_id IS NULL AND
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  -- Can only set auth_id to their own
  auth_id = auth.uid()
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.verify_staff_registration TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_staff_account TO authenticated;

-- Enable row security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON FUNCTION public.verify_staff_registration IS 'Checks if a staff member can create an account';
COMMENT ON FUNCTION public.link_staff_account IS 'Links a staff record to an auth account';
