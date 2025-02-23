-- Begin transaction
BEGIN;

-- Ensure metadata tables exist
CREATE TABLE IF NOT EXISTS auth.users_meta (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Drop and recreate triggers to handle metadata
DROP TRIGGER IF EXISTS handle_metadata ON auth.users;

CREATE OR REPLACE FUNCTION auth.handle_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO auth.users_meta (id, raw_app_meta_data, raw_user_meta_data)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
        COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
    )
    ON CONFLICT (id) DO UPDATE SET
        raw_app_meta_data = EXCLUDED.raw_app_meta_data,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER handle_metadata
    AFTER INSERT OR UPDATE OF raw_app_meta_data, raw_user_meta_data
    ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION auth.handle_user_metadata();

-- Grant permissions
GRANT ALL ON auth.users_meta TO service_role;
GRANT INSERT, SELECT ON auth.users_meta TO anon;
GRANT SELECT ON auth.users_meta TO authenticated;

-- Ensure sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth TO anon;

-- Set default metadata values for auth.users
ALTER TABLE auth.users 
    ALTER COLUMN raw_app_meta_data SET DEFAULT '{}'::jsonb,
    ALTER COLUMN raw_user_meta_data SET DEFAULT '{}'::jsonb;

-- Add helpful index
CREATE INDEX IF NOT EXISTS users_meta_updated_at_idx ON auth.users_meta(updated_at);

-- Add comment
COMMENT ON TABLE auth.users_meta IS 'Stores additional user metadata with proper defaults';

COMMIT;
