DO $$
BEGIN
  -- First, clean up any policies that might conflict
  FOR pol IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'auth' 
      AND tablename = 'users'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON auth.users', pol.policyname);
  END LOOP;

  -- Reset RLS and constraints
  ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
  ALTER TABLE auth.users DISABLE TRIGGER ALL;

  -- Drop ALL existing auth policies
  DROP POLICY IF EXISTS "auth_signup_policy" ON auth.users;
  DROP POLICY IF EXISTS "Allow new user registration" ON auth.users;
  DROP POLICY IF EXISTS "Enable read access for all users" ON auth.users;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON auth.users;
  DROP POLICY IF EXISTS "auth_read_policy" ON auth.users;

  -- Reset ALL permissions
  REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM anon, authenticated, service_role;

  -- Grant minimum required permissions
  GRANT USAGE ON SCHEMA auth TO service_role, anon, authenticated;
  GRANT ALL ON auth.users TO service_role;
  GRANT ALL ON auth.identities TO service_role;
  GRANT SELECT, INSERT ON auth.users TO anon;
  GRANT SELECT ON auth.users TO authenticated;

  -- Create single policy for insert
  CREATE POLICY "allow_staff_signup"
  ON auth.users
  FOR INSERT
  TO anon, service_role
  WITH CHECK (
    -- Either service role access
    current_setting('role', TRUE)::text = 'service_role'
    OR NULLIF(current_setting('request.jwt.claim.role', TRUE), '')::text = 'service_role'
    OR (
      -- Or verified staff registration
      email IS NOT NULL
      AND id IS NOT NULL
      AND EXISTS (
        SELECT 1 
        FROM staff 
        WHERE staff.email = auth.users.email
        AND staff.auth_id IS NULL 
        AND staff.email_verified = true
      )
    )
  );

  -- Create policy for reading own records
  CREATE POLICY "allow_user_read"
  ON auth.users
  FOR SELECT
  TO authenticated, service_role
  USING (
    auth.uid() = id
    OR current_setting('role', TRUE)::text = 'service_role'
    OR NULLIF(current_setting('request.jwt.claim.role', TRUE), '')::text = 'service_role'
  );

  -- Ensure auth.users table is properly configured
  ALTER TABLE auth.users
    ALTER COLUMN email SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now(),
    ALTER COLUMN raw_app_meta_data SET DEFAULT '{}'::jsonb,
    ALTER COLUMN raw_user_meta_data SET DEFAULT '{}'::jsonb;

  -- Enable RLS and minimal triggers
  ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_updated;

  -- Add comments
  COMMENT ON POLICY "allow_staff_signup" ON auth.users IS 'Allows staff signup and service role access';
  COMMENT ON POLICY "allow_user_read" ON auth.users IS 'Users can read their own records';

END;
$$;
