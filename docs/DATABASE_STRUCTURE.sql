-- Current Database Structure Documentation
-- Generated on 2025-02-05

-- Compliance Reports Table
CREATE TABLE IF NOT EXISTS compliance_reports (
    id uuid NOT NULL PRIMARY KEY,
    franchise_id uuid,
    audit_date date,
    food_quality_score numeric,
    service_score numeric,
    cleanliness_score numeric,
    brand_standards_score numeric,
    overall_score numeric,
    notes text,
    created_at timestamp with time zone
);

-- Daily Sales Table
CREATE TABLE IF NOT EXISTS daily_sales (
    id uuid NOT NULL PRIMARY KEY,
    franchise_id uuid,
    date date NOT NULL,
    total_orders integer NOT NULL,
    total_sales numeric NOT NULL,
    total_tax numeric NOT NULL,
    total_discount numeric NOT NULL,
    net_sales numeric NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

-- Franchise Settings Table
CREATE TABLE IF NOT EXISTS franchise_settings (
    id uuid NOT NULL PRIMARY KEY,
    name character varying(255) NOT NULL,
    address text,
    phone character varying(20),
    email character varying(255),
    currency character varying(10) NOT NULL,
    tax_rate numeric NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    standardized_menu_items jsonb,
    custom_menu_items jsonb,
    pricing_variations jsonb,
    delivery_settings jsonb,
    pos_configurations jsonb,
    loyalty_program_settings jsonb
);

-- Franchises Table
CREATE TABLE IF NOT EXISTS franchises (
    id uuid NOT NULL PRIMARY KEY,
    name text NOT NULL,
    address text NOT NULL,
    phone text,
    franchise_code text,
    agreement_start_date date,
    agreement_end_date date,
    royalty_percentage numeric,
    security_deposit numeric,
    brand_audit_score numeric,
    last_audit_date timestamp without time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);

-- Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id uuid NOT NULL PRIMARY KEY,
    franchise_id uuid,
    name text NOT NULL,
    category text NOT NULL,
    description text,
    price numeric NOT NULL,
    tax_rate numeric,
    is_active boolean,
    is_available boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id uuid NOT NULL PRIMARY KEY,
    order_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100),
    price numeric NOT NULL,
    quantity integer NOT NULL,
    tax_rate numeric,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id uuid NOT NULL PRIMARY KEY,
    franchise_id uuid NOT NULL,
    server_id uuid NOT NULL,
    server_name character varying(255) NOT NULL,
    table_number character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    payment_status character varying(50) NOT NULL,
    payment_method character varying(50),
    subtotal numeric NOT NULL,
    tax numeric NOT NULL,
    discount numeric NOT NULL,
    additional_charges numeric NOT NULL,
    total numeric NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    pending_at timestamp without time zone,
    preparing_at timestamp without time zone,
    ready_at timestamp without time zone,
    served_at timestamp without time zone,
    paid_at timestamp without time zone,
    cancelled_at timestamp without time zone
);

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id uuid NOT NULL PRIMARY KEY,
    franchise_id uuid,
    full_name text,
    email text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);

-- Sales Reports Table
CREATE TABLE IF NOT EXISTS sales_reports (
    id uuid NOT NULL PRIMARY KEY,
    franchise_id uuid,
    report_date date,
    transaction_count integer,
    daily_sales numeric,
    average_ticket_size numeric,
    royalty_amount numeric,
    created_at timestamp with time zone
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id uuid NOT NULL PRIMARY KEY,
    franchise_id uuid NOT NULL,
    restaurant_name text NOT NULL,
    address text,
    phone text NOT NULL,
    currency text NOT NULL,
    tax_rate numeric NOT NULL,
    print_format text NOT NULL,
    auto_backup boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

-- Current RLS Policies

-- Daily Sales Policies
CREATE POLICY "daily_sales_access" ON daily_sales
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'admin'
                OR (profiles.role = ANY (ARRAY['staff', 'manager'])
                    AND profiles.franchise_id = daily_sales.franchise_id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'admin'
                OR (profiles.role = 'manager'
                    AND profiles.franchise_id = daily_sales.franchise_id)
            )
        )
    );

-- Franchise Settings Policies
CREATE POLICY "franchise_settings_access" ON franchise_settings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'admin'
                OR (profiles.role = ANY (ARRAY['staff', 'manager'])
                    AND profiles.franchise_id = franchise_settings.id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'admin'
                OR (profiles.role = 'manager'
                    AND profiles.franchise_id = franchise_settings.id)
            )
        )
    );

-- Franchises Policies
CREATE POLICY "franchise_access" ON franchises
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'admin'
                OR (profiles.role = ANY (ARRAY['staff', 'manager'])
                    AND profiles.franchise_id = franchises.id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Menu Items Policies
CREATE POLICY "Everyone can view menu items" ON menu_items
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin can manage menu items" ON menu_items
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Order Items Policies
CREATE POLICY "order_items_franchise_access" ON order_items
    FOR ALL
    TO authenticated
    USING (
        order_id IN (
            SELECT orders.id FROM orders
            WHERE orders.franchise_id = (
                SELECT profiles.franchise_id
                FROM profiles
                WHERE profiles.id = auth.uid()
            )
        )
    )
    WITH CHECK (
        order_id IN (
            SELECT orders.id FROM orders
            WHERE orders.franchise_id = (
                SELECT profiles.franchise_id
                FROM profiles
                WHERE profiles.id = auth.uid()
            )
        )
    );

-- Orders Policies
CREATE POLICY "orders_franchise_access" ON orders
    FOR ALL
    TO authenticated
    USING (
        franchise_id = (
            SELECT profiles.franchise_id
            FROM profiles
            WHERE profiles.id = auth.uid()
        )
    )
    WITH CHECK (
        franchise_id = (
            SELECT profiles.franchise_id
            FROM profiles
            WHERE profiles.id = auth.uid()
        )
    );

-- Profiles Policies
CREATE POLICY "Staff can manage their profile" ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Settings Policies
CREATE POLICY "Users can view their franchise settings" ON settings
    FOR SELECT
    TO public
    USING (
        auth.uid() IN (
            SELECT profiles.id
            FROM profiles
            WHERE profiles.franchise_id = settings.franchise_id
        )
    );

CREATE POLICY "Users can update their franchise settings" ON settings
    FOR UPDATE
    TO public
    USING (
        auth.uid() IN (
            SELECT profiles.id
            FROM profiles
            WHERE profiles.franchise_id = settings.franchise_id
        )
    );

CREATE POLICY "Users can insert their franchise settings" ON settings
    FOR INSERT
    TO public
    WITH CHECK (
        auth.uid() IN (
            SELECT profiles.id
            FROM profiles
            WHERE profiles.franchise_id = settings.franchise_id
        )
    );

-- Foreign Key Relationships
-- profiles.franchise_id -> franchises.id
-- menu_items.franchise_id -> franchises.id
-- orders.franchise_id -> franchises.id
-- order_items.order_id -> orders.id
-- order_items.menu_item_id -> menu_items.id
-- daily_sales.franchise_id -> franchises.id
-- settings.franchise_id -> franchises.id
-- compliance_reports.franchise_id -> franchises.id
-- sales_reports.franchise_id -> franchises.id

-- Role System:
-- 1. admin: Full system access
-- 2. manager: Can manage their assigned franchise
-- 3. staff: Basic access to their assigned franchise