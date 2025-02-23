-- Drop existing functions first
DROP FUNCTION IF EXISTS is_super_admin(uuid);
DROP FUNCTION IF EXISTS has_franchise_access(uuid, uuid);
DROP FUNCTION IF EXISTS get_user_franchise_role(uuid, uuid);
DROP FUNCTION IF EXISTS verify_staff_pin(uuid, character, uuid);
DROP FUNCTION IF EXISTS log_staff_activity(uuid, text, jsonb);
DROP FUNCTION IF EXISTS log_super_admin_activity(uuid, text, jsonb, text);
DROP FUNCTION IF EXISTS staff_audit_trigger_func() CASCADE;

-- Helper Functions

-- Function to check if a user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.super_admin 
    WHERE auth_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user has access to a specific franchise
CREATE OR REPLACE FUNCTION has_franchise_access(user_id uuid, franchise_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_franchise_access
    WHERE auth_id = user_id 
    AND franchise_id = $2
  ) OR is_super_admin(user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in a franchise
CREATE OR REPLACE FUNCTION get_user_franchise_role(user_id uuid, franchise_id uuid)
RETURNS public.staff_role AS $$
DECLARE
  user_role public.staff_role;
BEGIN
  -- First check if user is super_admin
  IF is_super_admin(user_id) THEN
    RETURN 'super_admin'::public.staff_role;
  END IF;

  -- Get role from user_franchise_access
  SELECT role INTO user_role
  FROM public.user_franchise_access
  WHERE auth_id = user_id AND franchise_id = $2;

  RETURN COALESCE(user_role, 'staff'::public.staff_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify staff PIN
CREATE OR REPLACE FUNCTION verify_staff_pin(
  staff_id_input uuid,
  pin_input character(4),
  franchise_id_input uuid
) 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.staff 
    WHERE id = staff_id_input
    AND pin_code = pin_input
    AND franchise_id = franchise_id_input
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies

-- Franchises table policies
ALTER TABLE public.franchises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all franchises"
ON public.franchises
FOR ALL USING (
  is_super_admin(auth.uid())
);

CREATE POLICY "Users can view their assigned franchises"
ON public.franchises
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_franchise_access
    WHERE auth_id = auth.uid()
    AND franchise_id = id
  )
);

-- Franchise settings policies
ALTER TABLE public.franchise_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to franchise settings"
ON public.franchise_settings
FOR ALL USING (
  is_super_admin(auth.uid())
);

CREATE POLICY "Admins can manage their franchise settings"
ON public.franchise_settings
FOR ALL USING (
  get_user_franchise_role(auth.uid(), franchise_id) = 'admin'
);

CREATE POLICY "Staff can view franchise settings"
ON public.franchise_settings
FOR SELECT USING (
  has_franchise_access(auth.uid(), franchise_id)
);

-- Menu items policies
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to menu items"
ON public.menu_items
FOR ALL USING (
  is_super_admin(auth.uid())
);

CREATE POLICY "Users can view menu items of their franchises"
ON public.menu_items
FOR SELECT USING (
  has_franchise_access(auth.uid(), franchise_id)
);

CREATE POLICY "Admins and managers can manage menu items"
ON public.menu_items
FOR ALL USING (
  get_user_franchise_role(auth.uid(), franchise_id) IN ('admin', 'manager')
);

-- Staff policies
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to staff"
ON public.staff
FOR ALL USING (
  is_super_admin(auth.uid())
);

CREATE POLICY "Admins can manage staff in their franchise"
ON public.staff
FOR ALL USING (
  get_user_franchise_role(auth.uid(), franchise_id) = 'admin'
);

CREATE POLICY "Staff can view other staff in their franchise"
ON public.staff
FOR SELECT USING (
  has_franchise_access(auth.uid(), franchise_id)
);

-- Orders policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to orders"
ON public.orders
FOR ALL USING (
  is_super_admin(auth.uid())
);

CREATE POLICY "Staff can manage orders in their franchise"
ON public.orders
FOR ALL USING (
  has_franchise_access(auth.uid(), franchise_id)
);

-- Order items policies
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to order items"
ON public.order_items
FOR ALL USING (
  is_super_admin(auth.uid())
);

CREATE POLICY "Staff can manage order items in their franchise"
ON public.order_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND has_franchise_access(auth.uid(), o.franchise_id)
  )
);

-- Staff activity policies
ALTER TABLE public.staff_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all staff activity"
ON public.staff_activity
FOR SELECT USING (
  is_super_admin(auth.uid())
);

CREATE POLICY "Staff can view activity in their franchise"
ON public.staff_activity
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_id
    AND has_franchise_access(auth.uid(), s.franchise_id)
  )
);

CREATE POLICY "Staff can create their own activity logs"
ON public.staff_activity
FOR INSERT WITH CHECK (
  staff_id IN (
    SELECT id FROM public.staff
    WHERE auth_id = auth.uid()
  )
);

-- Super admin activity policies
ALTER TABLE public.super_admin_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only super admins can view super admin activity"
ON public.super_admin_activity
FOR SELECT USING (
  is_super_admin(auth.uid())
);

CREATE POLICY "Super admins can create activity logs"
ON public.super_admin_activity
FOR INSERT WITH CHECK (
  super_admin_id IN (
    SELECT id FROM public.super_admin
    WHERE auth_id = auth.uid()
  )
);

-- User franchise access policies
ALTER TABLE public.user_franchise_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all access"
ON public.user_franchise_access
FOR ALL USING (
  is_super_admin(auth.uid())
);

CREATE POLICY "Admins can view access in their franchise"
ON public.user_franchise_access
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_franchise_access ufa
    WHERE ufa.auth_id = auth.uid()
    AND ufa.franchise_id = franchise_id
    AND ufa.role = 'admin'
  )
);

-- Create activity logging functions
CREATE OR REPLACE FUNCTION log_staff_activity(
  staff_id_input uuid,
  action_type_input text,
  action_details_input jsonb
) RETURNS uuid AS $$
DECLARE
  activity_id uuid;
BEGIN
  INSERT INTO public.staff_activity (staff_id, action_type, action_details)
  VALUES (staff_id_input, action_type_input, action_details_input)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_super_admin_activity(
  admin_id_input uuid,
  action_type_input text,
  action_details_input jsonb,
  ip_address_input text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  activity_id uuid;
BEGIN
  INSERT INTO public.super_admin_activity (super_admin_id, action_type, action_details, ip_address)
  VALUES (admin_id_input, action_type_input, action_details_input, ip_address_input)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for automatic activity logging
CREATE OR REPLACE FUNCTION staff_audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get the ID of the admin making the change
  SELECT id INTO admin_id
  FROM public.staff
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    PERFORM log_staff_activity(
      admin_id,
      'staff_created',
      jsonb_build_object('staff_id', NEW.id, 'details', row_to_json(NEW))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_staff_activity(
      admin_id,
      'staff_updated',
      jsonb_build_object(
        'staff_id', NEW.id,
        'old_data', row_to_json(OLD),
        'new_data', row_to_json(NEW)
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_staff_activity(
      admin_id,
      'staff_deleted',
      jsonb_build_object('staff_id', OLD.id, 'details', row_to_json(OLD))
    );
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER staff_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.staff
FOR EACH ROW EXECUTE FUNCTION staff_audit_trigger_func();

-- Add security policies to all tables
ALTER TABLE public.franchises FORCE ROW LEVEL SECURITY;
ALTER TABLE public.franchise_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff FORCE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.order_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_activity FORCE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_activity FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_franchise_access FORCE ROW LEVEL SECURITY;