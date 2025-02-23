-- Step 1: Create default super admin
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
    'Super Administrator',
    'e739b600-aa23-4003-a812-82d9ca747638'
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

-- Step 2: Create default staff member
DO $create_staff$ 
DECLARE
  v_staff_id uuid;
BEGIN
  -- Create staff record
  INSERT INTO public.staff (
    email,
    full_name,
    staff_type,
    email_verified,
    permissions,
    auth_id
  ) VALUES (
    'haricrisb@gmail.com',
    'Admin User',
    'admin',
    true,
    jsonb_build_object(
      'can_access_pos', true,
      'can_access_kitchen', true,
      'can_access_reports', true,
      'can_manage_menu', true,
      'can_manage_staff', true
    ),
    NULL -- auth_id will be linked when staff creates their account
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
END $create_staff$;

-- Step 3: Create a default franchise for testing
DO $create_franchise$ 
DECLARE
  v_franchise_id uuid;
  v_settings_id uuid;
BEGIN
  -- Create franchise
  INSERT INTO public.franchises (
    name,
    address,
    settings
  ) VALUES (
    'Test Franchise',
    '123 Test Street, Test City',
    jsonb_build_object(
      'subscription_status', 'active',
      'max_staff_count', 50,
      'features_enabled', jsonb_build_array('pos', 'kitchen', 'reports')
    )
  )
  RETURNING id INTO v_franchise_id;

  -- Create franchise settings
  INSERT INTO public.franchise_settings (
    franchise_id,
    business_name,
    tax_rate,
    currency,
    theme,
    business_hours,
    email,
    phone,
    address,
    receipt_footer,
    receipt_header
  ) VALUES (
    v_franchise_id,
    'Test Business',
    5.00,
    'INR',
    '{"primaryColor": "#FFA500", "secondaryColor": "#FFD700"}',
    '{"monday": {"open": "09:00", "close": "22:00"}}',
    'test@business.com',
    '+91 1234567890',
    '123 Test Street, Test City',
    'Thank you for your business!',
    'Test Business - Quality Food & Service'
  )
  RETURNING id INTO v_settings_id;

  -- Create sample menu items
  INSERT INTO public.menu_items (
    franchise_id,
    name,
    description,
    price,
    category,
    tax_rate
  ) VALUES 
  (v_franchise_id, 'Test Item 1', 'Description for test item 1', 199.99, 'Main Course', 5.00),
  (v_franchise_id, 'Test Item 2', 'Description for test item 2', 149.99, 'Appetizers', 5.00),
  (v_franchise_id, 'Test Item 3', 'Description for test item 3', 299.99, 'Desserts', 5.00);

END $create_franchise$;

--output
-- Success. No rows returned



