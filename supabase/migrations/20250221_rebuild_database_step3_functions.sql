-- Step 1: Create check_staff_permissions function
CREATE OR REPLACE FUNCTION check_staff_permissions(user_id uuid, required_permission text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff s
    WHERE s.auth_id = user_id
    AND (
      s.staff_type = 'admin' 
      OR (s.permissions->>required_permission)::boolean = true
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create verify_staff_pin function
CREATE OR REPLACE FUNCTION verify_staff_pin(
  p_staff_id UUID,
  p_franchise_id UUID,
  p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM staff
    WHERE id = p_staff_id
    AND franchise_id = p_franchise_id
    AND pin_code = p_pin
    AND status = 'active'
  );
END;
$$;

-- Step 3: Create verify_staff_email function
CREATE OR REPLACE FUNCTION verify_staff_email()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM staff WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'Email not pre-registered by admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create check_super_admin function
CREATE OR REPLACE FUNCTION check_super_admin(check_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM super_admin
    WHERE auth_id = check_auth_id
  );
END;
$$;

-- Step 5: Create link_super_admin_with_auth function
CREATE OR REPLACE FUNCTION link_super_admin_with_auth(
  p_email text,
  p_auth_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid;
BEGIN
  -- Get super admin id
  SELECT id INTO v_super_admin_id
  FROM super_admin
  WHERE email = p_email
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Super admin with email % not found', p_email;
  END IF;

  -- Update auth_id
  UPDATE super_admin
  SET auth_id = p_auth_id,
      updated_at = now()
  WHERE id = v_super_admin_id;

  RETURN v_super_admin_id;
END;
$$;

-- Step 6: Create ensure_super_admin function
CREATE OR REPLACE FUNCTION ensure_super_admin(
  p_email text DEFAULT 'admin@ak.com',
  p_full_name text DEFAULT 'System Administrator'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid;
BEGIN
  -- Check if super admin exists
  SELECT id INTO v_super_admin_id
  FROM super_admin
  WHERE email = p_email;

  -- If not exists, create one
  IF NOT FOUND THEN
    INSERT INTO super_admin (
      email,
      full_name
    ) VALUES (
      p_email,
      p_full_name
    )
    RETURNING id INTO v_super_admin_id;
  END IF;

  RETURN v_super_admin_id;
END;
$$;

-- Step 7: Create add_super_admin function
CREATE OR REPLACE FUNCTION add_super_admin(
  p_email text,
  p_full_name text,
  p_auth_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid;
BEGIN
  -- Check if caller is super admin
  IF NOT check_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can add other super admins';
  END IF;

  -- Insert new super admin
  INSERT INTO super_admin (
    email,
    full_name,
    auth_id
  ) VALUES (
    p_email,
    p_full_name,
    p_auth_id
  )
  RETURNING id INTO v_super_admin_id;

  RETURN v_super_admin_id;
END;
$$;

-- Step 8: Create get_user_role function
CREATE OR REPLACE FUNCTION get_user_role(check_auth_id uuid)
RETURNS TABLE (
  role_type text,
  id uuid,
  is_super_admin boolean
) AS $$
BEGIN
  -- First check super admin
  IF EXISTS (SELECT 1 FROM super_admin WHERE auth_id = check_auth_id) THEN
    RETURN QUERY
    SELECT
      'super_admin'::text,
      sa.id,
      true
    FROM super_admin sa
    WHERE sa.auth_id = check_auth_id;
    RETURN;
  END IF;

  -- Then check staff
  RETURN QUERY
  SELECT
    s.staff_type::text,
    s.id,
    false
  FROM staff s
  WHERE s.auth_id = check_auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create prevent_role_conflict function and triggers
CREATE OR REPLACE FUNCTION prevent_role_conflict()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.auth_id != OLD.auth_id THEN
    IF EXISTS (
      SELECT 1 FROM get_user_role(NEW.auth_id)
      WHERE role_type IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'User already has a role in the system';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for role conflict prevention
CREATE TRIGGER check_role_conflict_super_admin
  BEFORE INSERT OR UPDATE ON super_admin
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_conflict();

CREATE TRIGGER check_role_conflict_staff
  BEFORE INSERT OR UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_conflict();

-- Step 10: Create get_total_revenue_last_30_days function
CREATE OR REPLACE FUNCTION get_total_revenue_last_30_days()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user has super admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.super_admin
    WHERE auth_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Get total revenue with proper handling of nulls
  SELECT COALESCE(SUM(COALESCE(total, 0)), 0)
  INTO v_total
  FROM public.orders o
  WHERE
    o.created_at >= NOW() - INTERVAL '30 days'
    AND o.status NOT IN ('cancelled');

  RETURN v_total;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE WARNING 'Error in get_total_revenue_last_30_days: %', SQLERRM;
    -- Return 0 instead of failing
    RETURN 0;
END;
$$;



--output:
Success. No rows returned


