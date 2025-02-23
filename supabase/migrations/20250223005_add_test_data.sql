-- First fix the staff table policy
DROP POLICY IF EXISTS "Super admins have full access to staff" ON public.staff;
CREATE POLICY "Super admins can view staff for reporting"
ON public.staff
FOR SELECT USING (
  is_super_admin(auth.uid())
);

-- Step 1: Create default franchise and settings
DO $create_franchise$
DECLARE
  v_franchise_id uuid := 'f7e3915b-3177-4181-9c83-e5c3b4f38ebe';
  v_settings_id uuid;
BEGIN
  -- Create franchise
  INSERT INTO public.franchises (
    id,
    name,
    address,
    settings
  ) VALUES (
    v_franchise_id,
    'Anwars Kitchen - Test Branch',
    '123 Test Street, Chennai, Tamil Nadu',
    jsonb_build_object(
      'subscription_status', 'active',
      'max_staff_count', 50,
      'features_enabled', jsonb_build_array('pos', 'kitchen', 'reports')
    )
  );

  -- Create franchise settings
  INSERT INTO public.franchise_settings (
    franchise_id,
    business_name,
    tax_rate,
    currency,
    theme,
    business_hours,
    phone,
    email,
    address,
    gst_number,
    receipt_footer,
    receipt_header
  ) VALUES (
    v_franchise_id,
    'Anwars Kitchen',
    5.00,
    'INR',
    '{"primaryColor": "#FFA500", "secondaryColor": "#FFD700"}'::json,
    '{"monday": {"open": "09:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "22:00"}, "wednesday": {"open": "09:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "22:00"}, "friday": {"open": "09:00", "close": "22:00"}, "saturday": {"open": "09:00", "close": "23:00"}, "sunday": {"open": "09:00", "close": "23:00"}}'::json,
    '+91 9876543210',
    'contact@anwarskitchen.com',
    '123 Test Street, Chennai, Tamil Nadu',
    'GST123456789',
    'Thank you for dining with us!',
    'Anwars Kitchen - Authentic Flavors'
  )
  RETURNING id INTO v_settings_id;

  -- Create sample menu items
  INSERT INTO public.menu_items (
    franchise_id,
    name,
    description,
    price,
    category,
    image_url,
    is_available,
    is_active,
    tax_rate
  ) VALUES
  (
    v_franchise_id,
    'Chicken Biryani',
    'Aromatic rice dish with tender chicken and special spices',
    299.00,
    'Main Course',
    'https://example.com/biryani.jpg',
    true,
    true,
    5.00
  ),
  (
    v_franchise_id,
    'Mutton Curry',
    'Rich and spicy mutton curry cooked to perfection',
    399.00,
    'Main Course',
    'https://example.com/mutton-curry.jpg',
    true,
    true,
    5.00
  ),
  (
    v_franchise_id,
    'Butter Naan',
    'Soft and buttery Indian bread',
    49.00,
    'Breads',
    'https://example.com/naan.jpg',
    true,
    true,
    5.00
  );
END $create_franchise$;

-- Step 2: Create super admin account
DO $create_super_admin$
DECLARE
  v_super_admin_id uuid;
BEGIN
  -- Create super admin record
  INSERT INTO public.super_admin (
    email,
    full_name,
    auth_id
  ) VALUES (
    'harikrish120027@gmail.com',
    'Hari Super Admin',
    'e739b600-aa23-4003-a812-82d9ca747638'  -- Pre-defined auth_id for super admin
  )
  RETURNING id INTO v_super_admin_id;

  -- Log super admin creation
  INSERT INTO public.super_admin_activity (
    super_admin_id,
    action_type,
    action_details
  ) VALUES (
    v_super_admin_id,
    'account_created',
    jsonb_build_object(
      'email', 'harikrish120027@gmail.com',
      'created_at', now()
    )
  );
END $create_super_admin$;

-- Step 3: Create staff admin account
DO $create_staff_admin$
DECLARE
  v_staff_id uuid;
BEGIN
  -- Create staff admin record
  INSERT INTO public.staff (
    franchise_id,
    email,
    full_name,
    staff_type,
    status,
    email_verified,
    permissions,
    pin_code
  ) VALUES (
    'f7e3915b-3177-4181-9c83-e5c3b4f38ebe',  -- franchise_id
    'haricrisb@gmail.com',
    'Hari Admin',
    'admin',
    'active',
    true,
    jsonb_build_object(
      'can_access_pos', true,
      'can_access_kitchen', true,
      'can_access_reports', true,
      'can_manage_menu', true,
      'can_manage_staff', true
    ),
    '1234'
  )
  RETURNING id INTO v_staff_id;

  -- Log staff creation
  INSERT INTO public.staff_activity (
    staff_id,
    action_type,
    action_details
  ) VALUES (
    v_staff_id,
    'account_created',
    jsonb_build_object(
      'email', 'haricrisb@gmail.com',
      'created_at', now(),
      'staff_type', 'admin'
    )
  );
END $create_staff_admin$;

-- Function to verify test setup
CREATE OR REPLACE FUNCTION verify_test_setup()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'franchise_exists', EXISTS (
      SELECT 1 FROM public.franchises 
      WHERE id = 'f7e3915b-3177-4181-9c83-e5c3b4f38ebe'
    ),
    'settings_exists', EXISTS (
      SELECT 1 FROM public.franchise_settings 
      WHERE franchise_id = 'f7e3915b-3177-4181-9c83-e5c3b4f38ebe'
    ),
    'menu_items_count', (
      SELECT COUNT(*) FROM public.menu_items 
      WHERE franchise_id = 'f7e3915b-3177-4181-9c83-e5c3b4f38ebe'
    ),
    'super_admin_exists', EXISTS (
      SELECT 1 FROM public.super_admin 
      WHERE email = 'harikrish120027@gmail.com'
    ),
    'staff_admin_exists', EXISTS (
      SELECT 1 FROM public.staff 
      WHERE email = 'haricrisb@gmail.com'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;