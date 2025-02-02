-- Create franchises table
CREATE TABLE IF NOT EXISTS franchises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    email TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    gst_number TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create franchise_settings table
CREATE TABLE IF NOT EXISTS franchise_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    currency TEXT DEFAULT 'INR' NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 5.0 NOT NULL,
    default_discount NUMERIC(5,2) DEFAULT 0.0 NOT NULL,
    opening_time TIME DEFAULT '09:00:00' NOT NULL,
    closing_time TIME DEFAULT '22:00:00' NOT NULL,
    timezone TEXT DEFAULT 'Asia/Kolkata' NOT NULL,
    menu_categories TEXT[] DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(franchise_id)
);

-- Create daily_sales table for analytics
CREATE TABLE IF NOT EXISTS daily_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_orders INTEGER DEFAULT 0 NOT NULL,
    total_sales NUMERIC(10,2) DEFAULT 0.0 NOT NULL,
    total_tax NUMERIC(10,2) DEFAULT 0.0 NOT NULL,
    total_discount NUMERIC(10,2) DEFAULT 0.0 NOT NULL,
    net_sales NUMERIC(10,2) DEFAULT 0.0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(franchise_id, date)
);

-- Add franchise_id to existing tables
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id) ON DELETE SET NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_franchises_updated_at
    BEFORE UPDATE ON franchises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_franchise_settings_updated_at
    BEFORE UPDATE ON franchise_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_sales_updated_at
    BEFORE UPDATE ON daily_sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create franchise settings
CREATE OR REPLACE FUNCTION create_franchise_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO franchise_settings (franchise_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically create franchise settings
CREATE TRIGGER create_franchise_settings_after_insert
    AFTER INSERT ON franchises
    FOR EACH ROW
    EXECUTE FUNCTION create_franchise_settings();

-- Create function to update daily sales
CREATE OR REPLACE FUNCTION update_daily_sales()
RETURNS TRIGGER AS $$
DECLARE
    order_date DATE;
BEGIN
    order_date := DATE(NEW.created_at);
    
    INSERT INTO daily_sales (
        franchise_id,
        date,
        total_orders,
        total_sales,
        total_tax,
        total_discount,
        net_sales
    )
    VALUES (
        NEW.franchise_id,
        order_date,
        1,
        NEW.total,
        NEW.cgst + NEW.sgst,
        NEW.discount,
        NEW.total - (NEW.cgst + NEW.sgst)
    )
    ON CONFLICT (franchise_id, date)
    DO UPDATE SET
        total_orders = daily_sales.total_orders + 1,
        total_sales = daily_sales.total_sales + EXCLUDED.total_sales,
        total_tax = daily_sales.total_tax + EXCLUDED.total_tax,
        total_discount = daily_sales.total_discount + EXCLUDED.total_discount,
        net_sales = daily_sales.net_sales + EXCLUDED.net_sales,
        updated_at = timezone('utc'::text, now());
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update daily sales
CREATE TRIGGER update_daily_sales_after_insert
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_sales();

-- Create RLS policies
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;

-- Franchise owner can only see their own franchise
CREATE POLICY franchise_owner_select ON franchises
    FOR SELECT
    USING (id IN (
        SELECT franchise_id 
        FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'franchise_owner'
    ));

-- Super admin can see all franchises
CREATE POLICY super_admin_all ON franchises
    FOR ALL
    USING (EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'super_admin'
    ));

-- Similar policies for franchise_settings
CREATE POLICY franchise_settings_owner_select ON franchise_settings
    FOR SELECT
    USING (franchise_id IN (
        SELECT franchise_id 
        FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'franchise_owner'
    ));

CREATE POLICY franchise_settings_super_admin_all ON franchise_settings
    FOR ALL
    USING (EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'super_admin'
    ));

-- Similar policies for daily_sales
CREATE POLICY daily_sales_owner_select ON daily_sales
    FOR SELECT
    USING (franchise_id IN (
        SELECT franchise_id 
        FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'franchise_owner'
    ));

CREATE POLICY daily_sales_super_admin_all ON daily_sales
    FOR ALL
    USING (EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'super_admin'
    ));
