-- Function to link existing staff record with new auth account
CREATE OR REPLACE FUNCTION link_staff_account(
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
BEGIN
  -- Check if staff exists and is unlinked
  IF EXISTS (
    SELECT 1 FROM staff 
    WHERE email = p_email 
    AND auth_id IS NULL
  ) THEN
    -- Link the auth account
    UPDATE staff 
    SET 
      auth_id = p_auth_id,
      updated_at = NOW()
    WHERE 
      email = p_email 
      AND auth_id IS NULL;
    
    RETURN QUERY
    SELECT 
      TRUE as success,
      'Staff account linked successfully' as message;
  ELSIF EXISTS (
    SELECT 1 FROM staff 
    WHERE email = p_email 
    AND auth_id IS NOT NULL
  ) THEN
    -- Staff exists but already has auth_id
    RETURN QUERY
    SELECT 
      FALSE as success,
      'Staff account already linked to another user' as message;
  ELSE
    -- Staff doesn't exist
    RETURN QUERY
    SELECT 
      FALSE as success,
      'Staff record not found' as message;
  END IF;
END;
$$;

-- Function to check staff email status
CREATE OR REPLACE FUNCTION check_staff_email(p_email TEXT)
RETURNS TABLE (
  email_exists BOOLEAN,
  has_auth_id BOOLEAN,
  is_verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS (SELECT 1 FROM staff WHERE email = p_email) as email_exists,
    EXISTS (SELECT 1 FROM staff WHERE email = p_email AND auth_id IS NOT NULL) as has_auth_id,
    COALESCE(
      (SELECT email_verified FROM staff WHERE email = p_email),
      FALSE
    ) as is_verified;
END;
$$;

-- Drop old policy and create new one for staff account linking
DROP POLICY IF EXISTS "Allow linking auth_id for matching email" ON public.staff;
CREATE POLICY "Allow staff auth linking"
ON public.staff
FOR UPDATE
USING (
  -- Current record has no auth_id and email matches
  auth_id IS NULL 
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  auth_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = id
    AND s.email = email
    AND s.full_name = full_name
    AND s.staff_type = staff_type
    AND COALESCE(s.franchise_id, uuid_nil()) = COALESCE(franchise_id, uuid_nil())
    AND COALESCE(s.permissions::text, '{}') = COALESCE(permissions::text, '{}')
    AND s.status = status
    AND s.created_at = created_at
  )
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION link_staff_account(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_staff_email(TEXT) TO authenticated;
GRANT UPDATE (auth_id, updated_at) ON public.staff TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION link_staff_account IS 'Links an existing staff record to a new auth account';
COMMENT ON FUNCTION check_staff_email IS 'Checks status of a staff email address';
