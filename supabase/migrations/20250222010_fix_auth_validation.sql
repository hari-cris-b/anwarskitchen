-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS validate_new_user_insert ON auth.users;
DROP FUNCTION IF EXISTS auth.validate_new_user();
DROP FUNCTION IF EXISTS auth.check_staff_registration(text);

-- Create improved registration check function
CREATE OR REPLACE FUNCTION auth.check_staff_registration(
  reg_email TEXT,
  OUT is_valid BOOLEAN,
  OUT error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if email exists in staff
  IF NOT EXISTS (SELECT 1 FROM staff WHERE email = reg_email) THEN
    is_valid := false;
    error_message := 'No staff record found for this email';
    RETURN;
  END IF;

  -- Check if already has auth_id
  IF EXISTS (SELECT 1 FROM staff WHERE email = reg_email AND auth_id IS NOT NULL) THEN
    is_valid := false;
    error_message := 'Staff account already linked to another user';
    RETURN;
  END IF;

  -- Check if email is verified
  IF EXISTS (SELECT 1 FROM staff WHERE email = reg_email AND NOT email_verified) THEN
    is_valid := false;
    error_message := 'Staff email must be verified first';
    RETURN;
  END IF;

  -- All checks passed
  is_valid := true;
  error_message := NULL;
END;
$$;

-- Create improved validation trigger function
CREATE OR REPLACE FUNCTION auth.validate_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_valid BOOLEAN;
  v_error_message TEXT;
BEGIN
  -- Check registration eligibility
  SELECT is_valid, error_message 
  INTO v_is_valid, v_error_message
  FROM auth.check_staff_registration(NEW.email::text);

  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'Registration validation failed: %', v_error_message;
  END IF;

  -- Log successful validation
  RAISE NOTICE 'Staff registration validated for email: %', NEW.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise
    RAISE NOTICE 'Staff registration validation error: % %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- Apply trigger
CREATE TRIGGER validate_new_user_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.validate_new_user();

-- Grant permissions
GRANT EXECUTE ON FUNCTION auth.check_staff_registration(TEXT) TO service_role;
GRANT ALL ON auth.users TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION auth.check_staff_registration IS 'Validates staff registration eligibility with detailed error messages';
COMMENT ON FUNCTION auth.validate_new_user IS 'Ensures new users are eligible staff members with proper error handling';
