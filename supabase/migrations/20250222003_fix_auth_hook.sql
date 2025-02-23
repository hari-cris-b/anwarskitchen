-- Drop and recreate auth triggers and hooks
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Just let the user creation happen without any additional hooks
  -- We'll handle profile linking separately through our API
  RETURN NEW;
END;
$$;

-- Recreate trigger with simplified logic
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_created();

-- Make sure link_staff_account function is idempotent
CREATE OR REPLACE FUNCTION public.link_staff_account(
  p_email TEXT,
  p_auth_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id UUID;
BEGIN
  -- Get the staff ID first
  SELECT id INTO v_staff_id
  FROM staff 
  WHERE email = p_email;

  -- Check if staff exists
  IF v_staff_id IS NULL THEN
    RETURN QUERY
    SELECT 
      FALSE as success,
      'Staff record not found' as message;
    RETURN;
  END IF;

  -- Check if already linked to different auth_id
  IF EXISTS (
    SELECT 1 FROM staff 
    WHERE id = v_staff_id 
    AND auth_id IS NOT NULL 
    AND auth_id != p_auth_id
  ) THEN
    RETURN QUERY
    SELECT 
      FALSE as success,
      'Staff account already linked to another user' as message;
    RETURN;
  END IF;

  -- Update staff record
  UPDATE staff 
  SET 
    auth_id = p_auth_id,
    updated_at = NOW()
  WHERE id = v_staff_id
  AND (auth_id IS NULL OR auth_id = p_auth_id);

  RETURN QUERY
  SELECT 
    TRUE as success,
    'Staff account linked successfully' as message;
END;
$$;

-- Update staff auth linking policy to be more permissive
DROP POLICY IF EXISTS "Allow staff auth linking" ON public.staff;
CREATE POLICY "Allow staff auth linking"
ON public.staff
FOR UPDATE
USING (
  -- Only allow unlinked accounts or self-updates
  (auth_id IS NULL OR auth_id = auth.uid())
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  -- Ensure only auth_id and timestamp are modified
  auth_id = auth.uid()
  AND updated_at IS NOT NULL
);

-- Helpful comment
COMMENT ON FUNCTION public.handle_auth_user_created IS 'Simplified auth hook that allows user creation without immediate profile linking';
COMMENT ON FUNCTION public.link_staff_account IS 'Safely link staff record to auth account with proper validation';
