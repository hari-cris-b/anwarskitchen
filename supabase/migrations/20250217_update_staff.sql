-- Add email verification column to staff table
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Update existing staff records to have email_verified true for existing admin accounts
UPDATE staff
SET email_verified = true
WHERE staff_type = 'admin'
  AND auth_id IS NOT NULL;

-- Create stored function to check staff email verification
CREATE OR REPLACE FUNCTION check_staff_email_verification(staff_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM staff
    WHERE email = staff_email
      AND email_verified = true
  );
END;
$$;

-- Create trigger to enforce email verification before auth account creation
CREATE OR REPLACE FUNCTION tr_check_staff_email_before_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the email exists in staff table and is verified
  IF NOT EXISTS (
    SELECT 1 
    FROM staff 
    WHERE email = NEW.email 
      AND email_verified = true
  ) THEN
    RAISE EXCEPTION 'Email not found or not verified in staff records';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_staff_email_before_auth ON auth.users;

-- Create trigger
CREATE TRIGGER check_staff_email_before_auth
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION tr_check_staff_email_before_auth();

-- Add RLS policies for email verification
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to update email verification"
ON staff
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM staff s
    WHERE s.id = auth.uid()
      AND s.staff_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM staff s
    WHERE s.id = auth.uid()
      AND s.staff_type = 'admin'
  )
);

-- Update staff table indexes
CREATE INDEX IF NOT EXISTS idx_staff_email_verification
ON staff(email, email_verified);

-- Add constraint to ensure email is unique when verified
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_verified_email
ON staff(email)
WHERE email_verified = true;