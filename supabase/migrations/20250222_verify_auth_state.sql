-- Begin transaction
BEGIN;

-- Function to check auth tables state
CREATE OR REPLACE FUNCTION check_auth_state(p_email text) 
RETURNS TABLE (
    table_name text,
    record_exists boolean,
    details jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check auth.users
    RETURN QUERY
    SELECT 
        'auth.users'::text,
        EXISTS(SELECT 1 FROM auth.users WHERE email = p_email),
        CASE 
            WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = p_email) 
            THEN jsonb_build_object(
                'id', id,
                'created_at', created_at,
                'role', role,
                'has_password', (encrypted_password IS NOT NULL)
            )
            ELSE '{}'::jsonb
        END
    FROM auth.users 
    WHERE email = p_email;

    -- Check auth.identities
    RETURN QUERY
    SELECT 
        'auth.identities'::text,
        EXISTS(
            SELECT 1 
            FROM auth.identities i 
            JOIN auth.users u ON i.user_id = u.id 
            WHERE u.email = p_email
        ),
        CASE 
            WHEN EXISTS(
                SELECT 1 
                FROM auth.identities i 
                JOIN auth.users u ON i.user_id = u.id 
                WHERE u.email = p_email
            ) 
            THEN jsonb_build_object(
                'provider', provider,
                'created_at', created_at
            )
            ELSE '{}'::jsonb
        END
    FROM auth.identities i
    JOIN auth.users u ON i.user_id = u.id
    WHERE u.email = p_email;

    -- Check auth permissions
    RETURN QUERY
    SELECT 
        'auth.permissions'::text,
        true,
        jsonb_build_object(
            'anon_can_insert', has_table_privilege('anon', 'auth.users', 'INSERT'),
            'auth_rls_enabled', EXISTS (
                SELECT 1 
                FROM pg_class c 
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'auth' 
                AND c.relname = 'users' 
                AND c.relrowsecurity
            )
        );

    -- Check staff table state
    RETURN QUERY
    SELECT 
        'public.staff'::text,
        EXISTS(SELECT 1 FROM public.staff WHERE email = p_email),
        CASE 
            WHEN EXISTS(SELECT 1 FROM public.staff WHERE email = p_email) 
            THEN jsonb_build_object(
                'email_verified', email_verified,
                'has_auth_id', (auth_id IS NOT NULL)
            )
            ELSE '{}'::jsonb
        END
    FROM public.staff 
    WHERE email = p_email;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_auth_state TO anon, authenticated, service_role;

-- Add helpful index
CREATE INDEX IF NOT EXISTS users_last_signin_idx ON auth.users(last_sign_in_at);
CREATE INDEX IF NOT EXISTS staff_auth_id_idx ON public.staff(auth_id) WHERE auth_id IS NOT NULL;

-- Add comment
COMMENT ON FUNCTION check_auth_state IS 'Checks auth tables state for debugging signup issues';

COMMIT;
