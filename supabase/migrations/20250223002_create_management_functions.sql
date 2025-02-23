-- Functions for franchise management and user permissions

-- Function to create a new staff member with initial setup
CREATE OR REPLACE FUNCTION create_staff_member(
  franchise_id_input uuid,
  full_name_input text,
  email_input text,
  staff_type_input public.staff_role DEFAULT 'staff'::public.staff_role,
  pin_code_input character(4) DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  new_staff_id uuid;
BEGIN
  -- Verify the caller has permission to create staff
  IF NOT (
    is_super_admin(auth.uid()) OR 
    get_user_franchise_role(auth.uid(), franchise_id_input) = 'admin'
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to create staff member';
  END IF;

  -- Create staff record
  INSERT INTO public.staff (
    franchise_id,
    full_name,
    email,
    staff_type,
    pin_code,
    permissions,
    status
  )
  VALUES (
    franchise_id_input,
    full_name_input,
    email_input,
    staff_type_input,
    pin_code_input,
    CASE staff_type_input
      WHEN 'admin' THEN jsonb_build_object(
        'can_access_pos', true,
        'can_access_kitchen', true,
        'can_access_reports', true,
        'can_manage_menu', true,
        'can_manage_staff', true
      )
      WHEN 'manager' THEN jsonb_build_object(
        'can_access_pos', true,
        'can_access_kitchen', true,
        'can_access_reports', true,
        'can_manage_menu', true,
        'can_manage_staff', false
      )
      ELSE jsonb_build_object(
        'can_access_pos', true,
        'can_access_kitchen', true,
        'can_access_reports', false,
        'can_manage_menu', false,
        'can_manage_staff', false
      )
    END,
    'active'
  )
  RETURNING id INTO new_staff_id;

  RETURN new_staff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update staff permissions
CREATE OR REPLACE FUNCTION update_staff_permissions(
  staff_id_input uuid,
  new_permissions jsonb
) RETURNS boolean AS $$
DECLARE
  target_franchise_id uuid;
  caller_role public.staff_role;
BEGIN
  -- Get the target staff member's franchise
  SELECT franchise_id INTO target_franchise_id
  FROM public.staff
  WHERE id = staff_id_input;

  -- Check caller's role for the franchise
  SELECT get_user_franchise_role(auth.uid(), target_franchise_id)
  INTO caller_role;

  -- Verify permissions
  IF NOT (
    is_super_admin(auth.uid()) OR 
    (caller_role = 'admin' AND target_franchise_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to update staff permissions';
  END IF;

  -- Update permissions
  UPDATE public.staff
  SET 
    permissions = new_permissions,
    updated_at = now()
  WHERE id = staff_id_input;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify staff access to specific features
CREATE OR REPLACE FUNCTION verify_staff_access(
  staff_id_input uuid,
  feature_name text
) RETURNS boolean AS $$
DECLARE
  staff_permissions jsonb;
BEGIN
  SELECT permissions INTO staff_permissions
  FROM public.staff
  WHERE id = staff_id_input;

  RETURN (staff_permissions->feature_name)::boolean;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manage franchise settings
CREATE OR REPLACE FUNCTION update_franchise_settings(
  franchise_id_input uuid,
  settings_update jsonb
) RETURNS boolean AS $$
DECLARE
  caller_role public.staff_role;
BEGIN
  -- Get caller's role
  SELECT get_user_franchise_role(auth.uid(), franchise_id_input)
  INTO caller_role;

  -- Verify permissions
  IF NOT (
    is_super_admin(auth.uid()) OR 
    caller_role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to update franchise settings';
  END IF;

  -- Update settings
  UPDATE public.franchise_settings
  SET 
    business_name = COALESCE((settings_update->>'business_name')::text, business_name),
    tax_rate = COALESCE((settings_update->>'tax_rate')::numeric, tax_rate),
    currency = COALESCE((settings_update->>'currency')::text, currency),
    theme = COALESCE((settings_update->>'theme')::json, theme),
    business_hours = COALESCE((settings_update->>'business_hours')::json, business_hours),
    phone = COALESCE((settings_update->>'phone')::text, phone),
    email = COALESCE((settings_update->>'email')::text, email),
    address = COALESCE((settings_update->>'address')::text, address),
    gst_number = COALESCE((settings_update->>'gst_number')::text, gst_number),
    receipt_footer = COALESCE((settings_update->>'receipt_footer')::text, receipt_footer),
    receipt_header = COALESCE((settings_update->>'receipt_header')::text, receipt_header),
    updated_at = now()
  WHERE franchise_id = franchise_id_input;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle staff account verification
CREATE OR REPLACE FUNCTION verify_staff_email(
  email_input text,
  franchise_id_input uuid
) RETURNS boolean AS $$
DECLARE
  staff_record RECORD;
BEGIN
  -- Check if staff exists with given email and franchise
  SELECT * INTO staff_record
  FROM public.staff
  WHERE email = email_input
  AND franchise_id = franchise_id_input
  AND status = 'active';

  IF staff_record.id IS NULL THEN
    RETURN false;
  END IF;

  -- Update email verification status
  UPDATE public.staff
  SET email_verified = true
  WHERE id = staff_record.id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle staff PIN management
CREATE OR REPLACE FUNCTION manage_staff_pin(
  staff_id_input uuid,
  new_pin character(4)
) RETURNS boolean AS $$
DECLARE
  target_franchise_id uuid;
  caller_role public.staff_role;
BEGIN
  -- Get the target staff member's franchise
  SELECT franchise_id INTO target_franchise_id
  FROM public.staff
  WHERE id = staff_id_input;

  -- Check caller's role
  SELECT get_user_franchise_role(auth.uid(), target_franchise_id)
  INTO caller_role;

  -- Verify permissions
  IF NOT (
    is_super_admin(auth.uid()) OR 
    caller_role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to manage staff PIN';
  END IF;

  -- Update PIN
  UPDATE public.staff
  SET 
    pin_code = new_pin,
    updated_at = now()
  WHERE id = staff_id_input;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to prevent staff and super_admin role overlap
CREATE OR REPLACE FUNCTION prevent_role_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.super_admin 
    WHERE auth_id = NEW.auth_id
  ) AND NEW.staff_type = 'super_admin' THEN
    RAISE EXCEPTION 'Cannot create staff account for super admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for preventing role overlap
DROP TRIGGER IF EXISTS staff_role_overlap_check ON public.staff;
CREATE TRIGGER staff_role_overlap_check
BEFORE INSERT OR UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION prevent_role_overlap();

-- Function to get staff member details with permissions
CREATE OR REPLACE FUNCTION get_staff_details(staff_id_input uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Verify caller has permission to view staff details
  IF NOT (
    is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = staff_id_input
      AND has_franchise_access(auth.uid(), s.franchise_id)
    )
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to view staff details';
  END IF;

  SELECT jsonb_build_object(
    'id', s.id,
    'full_name', s.full_name,
    'email', s.email,
    'staff_type', s.staff_type,
    'status', s.status,
    'permissions', s.permissions,
    'franchise_id', s.franchise_id,
    'email_verified', s.email_verified,
    'created_at', s.created_at
  )
  INTO result
  FROM public.staff s
  WHERE s.id = staff_id_input;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;