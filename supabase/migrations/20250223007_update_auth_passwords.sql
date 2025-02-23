-- Function to update auth user password
CREATE OR REPLACE FUNCTION update_auth_user_password(
  p_email text,
  p_password text
)
RETURNS boolean AS $$
BEGIN
  UPDATE auth.users
  SET 
    encrypted_password = crypt(p_password, gen_salt('bf')),
    updated_at = now()
  WHERE email = p_email;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update both user passwords to 'Password123!'
DO $update_passwords$
BEGIN
  -- Update super admin password
  PERFORM update_auth_user_password(
    'harikrish120027@gmail.com',
    'Password123!'
  );

  -- Update staff password
  PERFORM update_auth_user_password(
    'haricrisb@gmail.com',
    'Password123!'
  );

  -- Also ensure proper role metadata
  UPDATE auth.users
  SET 
    role = 'authenticated',
    raw_user_meta_data = raw_user_meta_data || 
      CASE 
        WHEN email = 'harikrish120027@gmail.com' THEN
          '{"role": "super_admin"}'::jsonb
        ELSE
          '{"role": "staff"}'::jsonb
      END,
    updated_at = now()
  WHERE email IN ('harikrish120027@gmail.com', 'haricrisb@gmail.com');
END
$update_passwords$;

-- Verify the updates
SELECT 
  jsonb_build_object(
    'super_admin', (
      SELECT jsonb_build_object(
        'email', email,
        'role', role,
        'meta_data', raw_user_meta_data
      )
      FROM auth.users 
      WHERE email = 'harikrish120027@gmail.com'
    ),
    'staff', (
      SELECT jsonb_build_object(
        'email', email,
        'role', role,
        'meta_data', raw_user_meta_data
      )
      FROM auth.users 
      WHERE email = 'haricrisb@gmail.com'
    )
  );