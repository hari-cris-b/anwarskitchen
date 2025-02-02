-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS check_admin_exists();

-- Create admin check function
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify profiles table if it exists
DO $$ 
BEGIN
    -- Add email column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'email'
    ) THEN
        ALTER TABLE profiles ADD COLUMN email TEXT;
        -- Update existing rows with email from auth.users
        UPDATE profiles p 
        SET email = u.email 
        FROM auth.users u 
        WHERE p.id = u.id;
        -- Make email NOT NULL and UNIQUE after populating
        ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;
        ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;

    -- Ensure other required columns exist with correct constraints
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN full_name TEXT NOT NULL DEFAULT 'New User';
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'staff' 
        CHECK (role IN ('staff', 'manager', 'admin'));
    END IF;

    -- Add timestamps if they don't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
END $$;

-- Drop existing policies (all possible names)
DO $$ 
BEGIN
    -- Drop all existing policies on profiles table
    DROP POLICY IF EXISTS "Enable read access for users" ON profiles;
    DROP POLICY IF EXISTS "Enable update for users" ON profiles;
    DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
    DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
    DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
    DROP POLICY IF EXISTS "Allow users to see own profile" ON profiles;
    DROP POLICY IF EXISTS "Allow admins to see all profiles" ON profiles;
    DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
    DROP POLICY IF EXISTS "Allow admins to update all profiles" ON profiles;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names
CREATE POLICY "allow_select_own_or_admin_20250129" ON profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() OR -- Can read own profile
        is_admin(auth.uid()) -- Admins can read all profiles
    );

CREATE POLICY "allow_insert_own_or_admin_20250129" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        id = auth.uid() OR -- Can insert own profile
        is_admin(auth.uid()) -- Admins can insert profiles
    );

CREATE POLICY "allow_update_own_or_admin_20250129" ON profiles
    FOR UPDATE TO authenticated
    USING (
        id = auth.uid() OR -- Can update own profile
        is_admin(auth.uid()) -- Admins can update all profiles
    )
    WITH CHECK (
        id = auth.uid() OR -- Can update own profile
        is_admin(auth.uid()) -- Admins can update all profiles
    );

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;

-- Ensure at least one admin exists
DO $$
DECLARE
    admin_exists BOOLEAN;
    first_user_id UUID;
    first_user_email TEXT;
BEGIN
    -- Check if any admin exists
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE role = 'admin'
    ) INTO admin_exists;

    IF NOT admin_exists THEN
        -- Get the first user from auth.users
        SELECT id, email INTO first_user_id, first_user_email
        FROM auth.users 
        ORDER BY created_at 
        LIMIT 1;

        IF first_user_id IS NOT NULL THEN
            -- Update or create admin profile
            INSERT INTO profiles (id, email, full_name, role)
            VALUES (
                first_user_id,
                first_user_email,
                split_part(first_user_email, '@', 1),
                'admin'
            )
            ON CONFLICT (id) DO UPDATE
            SET role = 'admin', email = EXCLUDED.email
            WHERE profiles.id = first_user_id;
        END IF;
    END IF;
END $$;
