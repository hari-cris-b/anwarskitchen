-- Drop all auth hooks first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

DROP FUNCTION IF EXISTS public.handle_auth_user_created();
DROP FUNCTION IF EXISTS public.handle_auth_user_updated();
DROP FUNCTION IF EXISTS public.handle_auth_user_deleted();

-- Create minimal auth hook that just tracks user creation
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Simply return the new user without any modifications
  -- Profile linking will be handled by the API
  RAISE NOTICE 'New user created: %', NEW.id;
  RETURN NEW;
END;
$$;

-- Recreate trigger with minimal hook
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_created();

-- Add helper function to check if auth account creation is allowed
CREATE OR REPLACE FUNCTION public.can_create_auth_account(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if email exists in staff and is unlinked
  RETURN EXISTS (
    SELECT 1 
    FROM staff 
    WHERE email = p_email 
    AND auth_id IS NULL
    AND email_verified = true
  );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.can_create_auth_account(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.can_create_auth_account(TEXT) TO authenticated;

-- Drop any conflicting triggers on auth.users
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN 
        SELECT DISTINCT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'users'
        AND event_object_schema = 'auth'
        AND trigger_name != 'on_auth_user_created'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', trigger_rec.trigger_name);
    END LOOP;
END $$;

-- Final cleanup
ALTER TABLE auth.users DISABLE TRIGGER ALL;
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- Add helpful comment
COMMENT ON FUNCTION public.handle_auth_user_created IS 'Minimal auth hook that allows user creation without interference';
COMMENT ON FUNCTION public.can_create_auth_account IS 'Checks if an email is eligible for auth account creation';
