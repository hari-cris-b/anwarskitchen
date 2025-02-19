-- Drop the not-null constraint for auth_id in user_franchise_access
ALTER TABLE user_franchise_access 
  ALTER COLUMN auth_id DROP NOT NULL;

-- Add trigger to manage user_franchise_access
CREATE OR REPLACE FUNCTION manage_user_franchise_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For staff creation
  IF TG_OP = 'INSERT' THEN
    -- Add franchise access record
    INSERT INTO user_franchise_access (auth_id, franchise_id, granted_by)
    VALUES (
      NEW.auth_id,  -- This might be null initially
      NEW.franchise_id,
      auth.uid()    -- Current user who is creating the staff
    );
  
  -- For staff update
  ELSIF TG_OP = 'UPDATE' THEN
    -- If auth_id is being set (user creates account)
    IF NEW.auth_id IS NOT NULL AND OLD.auth_id IS NULL THEN
      -- Update the existing access record
      UPDATE user_franchise_access
      SET auth_id = NEW.auth_id
      WHERE franchise_id = NEW.franchise_id
        AND auth_id IS NULL
        AND created_at = (
          SELECT MAX(created_at)
          FROM user_franchise_access
          WHERE franchise_id = NEW.franchise_id
            AND auth_id IS NULL
        );
    END IF;
  
  -- For staff deletion
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove franchise access
    DELETE FROM user_franchise_access
    WHERE auth_id = OLD.auth_id
      AND franchise_id = OLD.franchise_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS manage_user_franchise_access_trigger ON staff;

-- Create new trigger
CREATE TRIGGER manage_user_franchise_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION manage_user_franchise_access();

-- Add RLS policy for user_franchise_access
ALTER TABLE user_franchise_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own franchise access" ON user_franchise_access;
CREATE POLICY "Users can view their own franchise access"
  ON user_franchise_access
  FOR SELECT
  USING (
    auth.uid() = auth_id
    OR 
    auth.uid() IN (
      SELECT s.auth_id 
      FROM staff s 
      WHERE s.franchise_id = franchise_id 
        AND s.staff_type IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admin sa WHERE sa.auth_id = auth.uid()
    )
  );

-- Add function to check if user has franchise access
CREATE OR REPLACE FUNCTION has_franchise_access(user_id UUID, franchise_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_franchise_access 
    WHERE auth_id = user_id 
      AND franchise_id = franchise_id
  );
END;
$$;

-- Update staff RLS policies
DROP POLICY IF EXISTS "Staff members can view their franchise staff" ON staff;
CREATE POLICY "Staff members can view their franchise staff"
  ON staff
  FOR SELECT
  USING (
    has_franchise_access(auth.uid(), franchise_id)
    OR
    EXISTS (SELECT 1 FROM super_admin sa WHERE sa.auth_id = auth.uid())
  );

-- Add indices for better performance
CREATE INDEX IF NOT EXISTS idx_user_franchise_access_auth_id 
  ON user_franchise_access(auth_id) 
  WHERE auth_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_franchise_access_franchise 
  ON user_franchise_access(franchise_id, auth_id);