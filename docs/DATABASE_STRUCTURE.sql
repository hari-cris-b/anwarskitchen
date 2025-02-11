-- Current Database Structure

-- Compliance Reports Table
CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID,
  audit_date DATE,
  food_quality_score NUMERIC(3,1),
  service_score NUMERIC(3,1),
  cleanliness_score NUMERIC(3,1),
  brand_standards_score NUMERIC(3,1),
  overall_score NUMERIC(3,1),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Franchise Settings Table
CREATE TABLE franchise_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme JSON DEFAULT '{"primaryColor": "#FFA500", "secondaryColor": "#FFD700"}',
  tax_rate NUMERIC(5,2) DEFAULT 5.00,
  currency TEXT DEFAULT 'USD',
  business_hours JSON DEFAULT '{"monday": {"open": "09:00", "close": "22:00"}}',
  printer_config JSON DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Franchises Table
CREATE TABLE franchises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Menu Items Table
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  franchise_id UUID,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Order Items Table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  menu_item_id UUID NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  category TEXT,
  tax_rate NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Orders Table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number TEXT NOT NULL,
  server_id UUID NOT NULL,
  server_name TEXT NOT NULL,
  franchise_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  payment_method TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  tax NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) DEFAULT 0,
  additional_charges NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  pending_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  preparing_at TIMESTAMP WITH TIME ZONE,
  ready_at TIMESTAMP WITH TIME ZONE,
  served_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Profiles Table
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  franchise_id UUID NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sales Reports Table
CREATE TABLE sales_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID,
  report_date DATE,
  daily_sales NUMERIC(10,2),
  royalty_amount NUMERIC(10,2),
  transaction_count INTEGER,
  average_ticket_size NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Settings Table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID NOT NULL,
  restaurant_name TEXT NOT NULL,
  address TEXT,
  phone TEXT NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  print_format TEXT DEFAULT 'thermal',
  auto_backup BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);