-- Function to link super admin with auth user
CREATE OR REPLACE FUNCTION link_super_admin_with_auth(
  p_email text,
  p_auth_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid;
BEGIN
  -- Get super admin id
  SELECT id INTO v_super_admin_id
  FROM super_admin
  WHERE email = p_email
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Super admin with email % not found', p_email;
  END IF;

  -- Update auth_id
  UPDATE super_admin
  SET auth_id = p_auth_id,
      updated_at = now()
  WHERE id = v_super_admin_id;

  RETURN v_super_admin_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION link_super_admin_with_auth(text, uuid) TO authenticated;

-- Comment
COMMENT ON FUNCTION link_super_admin_with_auth IS 'Links existing super admin with their auth user ID';

-- Function to initialize super admin if needed
CREATE OR REPLACE FUNCTION ensure_super_admin(
  p_email text DEFAULT 'admin@ak.com',
  p_full_name text DEFAULT 'System Administrator'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid;
BEGIN
  -- Check if super admin exists
  SELECT id INTO v_super_admin_id
  FROM super_admin
  WHERE email = p_email;

  -- If not exists, create one
  IF NOT FOUND THEN
    INSERT INTO super_admin (
      email,
      full_name
    ) VALUES (
      p_email,
      p_full_name
    )
    RETURNING id INTO v_super_admin_id;
  END IF;

  RETURN v_super_admin_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION ensure_super_admin(text, text) TO authenticated;

-- Comment
COMMENT ON FUNCTION ensure_super_admin IS 'Ensures a super admin exists with given email';

-- Update super admin policies to allow linking
CREATE POLICY "Allow auth_id update for unlinked super admin" ON public.super_admin
FOR UPDATE
USING (
  auth_id IS NULL
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = current_user
    AND email = (SELECT email FROM super_admin WHERE id = public.super_admin.id)
  )
)
WITH CHECK (
  auth_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = current_user
    AND email = (SELECT email FROM super_admin WHERE id = public.super_admin.id)
  )
);

-- Create trigger function to prevent auth_id modification after set
CREATE OR REPLACE FUNCTION prevent_auth_id_modification()
RETURNS trigger AS $$
BEGIN
  IF OLD.auth_id IS NOT NULL AND NEW.auth_id != OLD.auth_id THEN
    RAISE EXCEPTION 'Cannot modify auth_id once set';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER prevent_auth_id_change
  BEFORE UPDATE ON super_admin
  FOR EACH ROW
  EXECUTE FUNCTION prevent_auth_id_modification();

-- Comment
COMMENT ON TRIGGER prevent_auth_id_change ON super_admin IS 'Prevents modification of auth_id once set';