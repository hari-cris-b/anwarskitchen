-- Add staff management columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS joining_date DATE,
ADD COLUMN IF NOT EXISTS salary NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS shift TEXT CHECK (shift IN ('morning', 'evening', 'night')),
ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id);

-- Create index on franchise_id for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_franchise_id ON profiles(franchise_id);

-- Update RLS policies to include franchise_id checks
DROP POLICY IF EXISTS "allow_select_own_or_admin_franchise_20250205" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_or_admin_franchise_20250205" ON profiles;

CREATE POLICY "allow_select_own_or_admin_franchise_20250205" ON profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() OR -- Can read own profile
        (is_admin(auth.uid()) AND -- Admins can read profiles in their franchise
         franchise_id = (SELECT franchise_id FROM profiles WHERE id = auth.uid()))
    );

CREATE POLICY "allow_update_own_or_admin_franchise_20250205" ON profiles
    FOR UPDATE TO authenticated
    USING (
        id = auth.uid() OR -- Can update own profile
        (is_admin(auth.uid()) AND -- Admins can update profiles in their franchise
         franchise_id = (SELECT franchise_id FROM profiles WHERE id = auth.uid()))
    )
    WITH CHECK (
        id = auth.uid() OR -- Can update own profile
        (is_admin(auth.uid()) AND -- Admins can update profiles in their franchise
         franchise_id = (SELECT franchise_id FROM profiles WHERE id = auth.uid()))
    );

-- Create a trigger to maintain updated_at
CREATE OR REPLACE FUNCTION update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_updated_at();