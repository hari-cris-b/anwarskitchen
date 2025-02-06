-- Function to update JWT claims for all existing users
CREATE OR REPLACE FUNCTION update_all_users_jwt_claims()
RETURNS void AS $$
DECLARE
    user_id uuid;
    profile_data profiles;
BEGIN
    -- Loop through all users
    FOR user_id IN SELECT id FROM auth.users
    LOOP
        -- Get profile data for each user
        SELECT * INTO profile_data
        FROM profiles
        WHERE id = user_id
        LIMIT 1;

        -- Update JWT claims if profile exists
        IF profile_data.id IS NOT NULL THEN
            UPDATE auth.users
            SET raw_app_meta_data = jsonb_set(
                raw_app_meta_data,
                '{profile}',
                jsonb_build_object(
                    'role', profile_data.role,
                    'franchise_id', profile_data.franchise_id
                )
            )
            WHERE id = user_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to update existing users
SELECT update_all_users_jwt_claims();