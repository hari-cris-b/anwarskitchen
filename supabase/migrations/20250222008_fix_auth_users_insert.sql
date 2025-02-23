-- Reset auth triggers to their default state
ALTER TABLE auth.users ENABLE TRIGGER ALL;

-- Ensure the auth schema has proper grants
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Allow the auth API to create users
GRANT INSERT ON TABLE auth.users TO anon, authenticated;
GRANT SELECT ON TABLE auth.users TO anon, authenticated;

-- Enable row level security
ALTER TABLE auth.users FORCE ROW LEVEL SECURITY;

-- Create policy for inserting users
DROP POLICY IF EXISTS "Allow user registration" ON auth.users;
CREATE POLICY "Allow user registration"
ON auth.users
FOR INSERT
WITH CHECK (
  -- Email must be verified through staff check
  EXISTS (
    SELECT 1 
    FROM public.staff 
    WHERE email = auth.users.email 
    AND auth_id IS NULL
    AND email_verified = true
  )
);

-- Create policy for selecting own user
DROP POLICY IF EXISTS "Allow users to select own record" ON auth.users;
CREATE POLICY "Allow users to select own record"
ON auth.users
FOR SELECT
USING (
  auth.uid() = id
);

-- Add helpful comment
COMMENT ON TABLE auth.users IS 'Auth users with proper RLS policies for registration';
