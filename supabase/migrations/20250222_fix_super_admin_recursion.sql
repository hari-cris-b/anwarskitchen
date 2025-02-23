-- Temporarily disable RLS
ALTER TABLE public.super_admin DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can view all super admin records" ON public.super_admin;
DROP POLICY IF EXISTS "Super admins can add new super admins" ON public.super_admin;
DROP POLICY IF EXISTS "Super admins can update super admin records" ON public.super_admin;
DROP POLICY IF EXISTS "Super admins can delete super admin records" ON public.super_admin;
DROP POLICY IF EXISTS "Allow auth_id update for unlinked super admin" ON public.super_admin;

-- Update the check_super_admin function to use direct table access
CREATE OR REPLACE FUNCTION check_super_admin(check_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Since this is SECURITY DEFINER, it will bypass RLS
  -- The function runs with the privileges of the function owner
  RETURN EXISTS (
    SELECT 1 
    FROM super_admin 
    WHERE auth_id = check_auth_id
  );
END;
$$;

-- Re-enable RLS
ALTER TABLE public.super_admin ENABLE ROW LEVEL SECURITY;

-- Create base policy for own record access
CREATE POLICY "Users can view their own super admin record"
ON public.super_admin
FOR SELECT
USING (auth_id = auth.uid());

-- Super admin specific policies using the fixed function
CREATE POLICY "Super admins can view all records"
ON public.super_admin
FOR SELECT
USING (check_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert records"
ON public.super_admin
FOR INSERT
WITH CHECK (check_super_admin(auth.uid()));

CREATE POLICY "Super admins can update records"
ON public.super_admin
FOR UPDATE
USING (check_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete records"
ON public.super_admin
FOR DELETE
USING (check_super_admin(auth.uid()));

-- Special policy for initial auth_id linking
CREATE POLICY "Allow linking auth_id for matching email"
ON public.super_admin
FOR UPDATE
USING (
  -- Can update if:
  -- 1. Current record has no auth_id (unlinked)
  -- 2. User's email matches the super_admin email
  auth_id IS NULL 
  AND email = (
    SELECT email 
    FROM auth.users 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  -- Only allow updating the auth_id field
  email = (SELECT email FROM super_admin WHERE id = id)
  AND full_name = (SELECT full_name FROM super_admin WHERE id = id)
  AND created_at = (SELECT created_at FROM super_admin WHERE id = id)
);

-- Ensure proper grants
GRANT EXECUTE ON FUNCTION check_super_admin(uuid) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION check_super_admin IS 'Securely checks if a user is a super admin (bypasses RLS)';
