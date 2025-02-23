-- Set up indices for performance
CREATE INDEX IF NOT EXISTS staff_email_idx ON staff (email) WHERE auth_id IS NULL;
CREATE INDEX IF NOT EXISTS staff_auth_idx ON staff (auth_id) WHERE auth_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_email_idx ON auth.users (email);

-- Disable email constraint temporarily
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE auth.users ADD CONSTRAINT users_email_key UNIQUE (email);

-- Make auth.users more robust
ALTER TABLE auth.users 
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Create trigger for auto-updating timestamps
CREATE OR REPLACE FUNCTION auth.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON auth.users;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.set_updated_at();

-- Add transaction support for user creation
CREATE OR REPLACE FUNCTION auth.create_new_user(
  p_email TEXT,
  p_user_id UUID,
  p_encrypted_password TEXT
)
RETURNS auth.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user auth.users;
BEGIN
  -- Start transaction
  BEGIN
    -- Insert new auth user
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_email,
      p_encrypted_password,
      NULL, -- Will be set on email confirmation
      now(),
      now()
    )
    RETURNING * INTO v_user;

    -- Link staff record
    UPDATE staff
    SET auth_id = p_user_id,
        updated_at = now()
    WHERE email = p_email
    AND auth_id IS NULL;

    RETURN v_user;
  EXCEPTION
    WHEN OTHERS THEN
      -- Cleanup on error
      DELETE FROM auth.users WHERE id = p_user_id;
      RAISE;
  END;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION auth.create_new_user TO service_role;

-- Ensure we have proper schema privileges
GRANT USAGE ON SCHEMA auth TO service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION auth.create_new_user IS 'Creates a new user with proper transaction handling';
COMMENT ON TRIGGER set_updated_at ON auth.users IS 'Updates updated_at timestamp on users table';
