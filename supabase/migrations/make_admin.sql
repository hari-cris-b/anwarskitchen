-- First, clear all profiles to start fresh
DELETE FROM profiles;

-- Get the first user from auth.users
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user ID
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        -- Create admin profile for the first user
        INSERT INTO profiles (id, full_name, role)
        VALUES (first_user_id, 'Admin User', 'admin');
        
        RAISE NOTICE 'Created admin user with ID: %', first_user_id;
    ELSE
        RAISE NOTICE 'No users found in auth.users table';
    END IF;
END $$;
