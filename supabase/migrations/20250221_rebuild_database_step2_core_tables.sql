-- Step 1: Create franchises table (no dependencies)
CREATE TABLE public.franchises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  settings jsonb DEFAULT jsonb_build_object(
    'subscription_status', 'active',
    'max_staff_count', 50,
    'features_enabled', jsonb_build_array('pos', 'kitchen', 'reports')
  ),
  CONSTRAINT franchises_pkey PRIMARY KEY (id)
);

-- Step 2: Create franchise_settings table (depends on franchises)
CREATE TABLE public.franchise_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL,
  business_name character varying(255) NULL,
  tax_rate numeric NULL DEFAULT 5.00,
  currency text NULL DEFAULT 'INR'::text,
  theme json NULL DEFAULT '{"primaryColor": "#FFA500", "secondaryColor": "#FFD700"}'::json,
  business_hours json NULL DEFAULT '{"monday": {"open": "09:00", "close": "22:00"}}'::json,
  phone character varying(255) NULL,
  email character varying(255) NULL,
  address text NULL,
  gst_number character varying(255) NULL,
  receipt_footer text NULL,
  receipt_header text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT franchise_settings_pkey PRIMARY KEY (id),
  CONSTRAINT franchise_settings_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_franchise_settings ON public.franchise_settings USING btree (franchise_id);

-- Step 3: Create menu_items table (depends on franchises)
CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL,
  name text NOT NULL,
  description text NULL,
  price numeric(10,2) NOT NULL,
  category text NOT NULL,
  image_url text NULL,
  is_available boolean NULL DEFAULT true,
  is_active boolean NULL DEFAULT true,
  tax_rate numeric NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_items_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_menu_items_franchise ON public.menu_items USING btree (franchise_id);

-- Step 4: Create super_admin table (depends on auth.users)
CREATE TABLE public.super_admin (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_id uuid NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT super_admin_pkey PRIMARY KEY (id),
  CONSTRAINT super_admin_auth_id_key UNIQUE (auth_id),
  CONSTRAINT super_admin_email_key UNIQUE (email),
  CONSTRAINT super_admin_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_super_admin_auth_id ON public.super_admin USING btree (auth_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_email ON public.super_admin USING btree (email);

-- Step 5: Create staff table (depends on franchises and auth.users)
CREATE TABLE public.staff (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  franchise_id uuid NULL,
  auth_id uuid NULL,
  full_name text NOT NULL,
  email text NULL,
  status public.status_type NOT NULL DEFAULT 'active'::status_type,
  can_void_orders boolean NULL DEFAULT false,
  can_modify_menu boolean NULL DEFAULT false,
  can_manage_staff boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  pin_code character(4) NULL,
  staff_type public.staff_role NOT NULL DEFAULT 'staff'::staff_role,
  permissions jsonb DEFAULT jsonb_build_object(
    'can_access_pos', true,
    'can_access_kitchen', true,
    'can_access_reports', false,
    'can_manage_menu', false,
    'can_manage_staff', false
  ),
  email_verified boolean DEFAULT false,
  phone text,
  shift text,
  hourly_rate text,
  joining_date text,
  CONSTRAINT staff_pkey PRIMARY KEY (id),
  CONSTRAINT staff_auth_id_key UNIQUE (auth_id),
  CONSTRAINT staff_email_key UNIQUE (email),
  CONSTRAINT staff_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id),
  CONSTRAINT staff_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_auth_id ON public.staff USING btree (auth_id);
CREATE UNIQUE INDEX IF NOT EXISTS staff_auth_franchise_unique ON public.staff 
  USING btree (auth_id, COALESCE(franchise_id, '00000000-0000-0000-0000-000000000000'::uuid)) 
  WHERE (staff_type <> 'super_admin'::staff_role);

-- Step 6: Create orders table (depends on franchises and staff)
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL,
  table_number text NOT NULL,
  status public.order_status NULL DEFAULT 'pending'::order_status,
  customer_name text NULL,
  server_id uuid NULL,
  server_name text NULL,
  notes text NULL,
  subtotal numeric NULL,
  tax numeric NULL,
  discount numeric NULL,
  additional_charges numeric NULL,
  total numeric NULL,
  payment_status text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
  CONSTRAINT orders_server_id_fkey FOREIGN KEY (server_id) REFERENCES staff(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_franchise ON public.orders USING btree (franchise_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders USING btree (status);

-- Step 7: Create order_items table (depends on orders and menu_items)
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  menu_item_id uuid NOT NULL,
  quantity integer NOT NULL,
  price_at_time numeric(10,2) NOT NULL,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items USING btree (order_id);

-- Step 8: Create staff_activity table (depends on staff)
CREATE TABLE public.staff_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id),
  action_type text NOT NULL,
  action_details jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT staff_activity_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_staff_activity_staff_id ON staff_activity(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_type ON staff_activity(action_type);

-- Step 9: Create super_admin_activity table (depends on super_admin)
CREATE TABLE public.super_admin_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  super_admin_id uuid REFERENCES super_admin(id),
  action_type text NOT NULL,
  action_details jsonb NOT NULL,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_super_admin_activity_admin_id ON super_admin_activity(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_activity_type ON super_admin_activity(action_type);

-- Step 10: Create user_franchise_access table (depends on franchises and auth.users)
CREATE TABLE public.user_franchise_access (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_id uuid NOT NULL,
  franchise_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  role public.staff_role NOT NULL DEFAULT 'staff'::staff_role,
  CONSTRAINT user_franchise_access_pkey PRIMARY KEY (id),
  CONSTRAINT user_franchise_access_auth_id_franchise_id_key UNIQUE (auth_id, franchise_id),
  CONSTRAINT user_franchise_access_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_franchise_access_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_franchise_access ON public.user_franchise_access USING btree (auth_id, franchise_id);

-- Enable RLS on all tables
ALTER TABLE public.franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchise_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_franchise_access ENABLE ROW LEVEL SECURITY;


--Output:
-- Success. No rows returned