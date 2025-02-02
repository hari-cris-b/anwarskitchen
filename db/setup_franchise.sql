-- Create franchises table if it doesn't exist
CREATE TABLE IF NOT EXISTS franchises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create franchise settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS franchise_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID REFERENCES franchises(id),
    currency TEXT DEFAULT 'INR',
    tax_rate NUMERIC DEFAULT 0.05,
    default_discount NUMERIC DEFAULT 0,
    opening_time TEXT DEFAULT '09:00',
    closing_time TEXT DEFAULT '23:00',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    menu_categories TEXT[] DEFAULT ARRAY[
        'Soups',
        'Premium Starters',
        'Chef''s Special',
        'Arabian Corner',
        'Breads',
        'Signature Biriyani',
        'Gravy Specials',
        'Rice & Noodles',
        'Refreshing Mojitos'
    ],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert or update franchise and settings
DO $$ 
DECLARE
    new_franchise_id UUID;
    existing_franchise_id UUID;
BEGIN
    -- Check if franchise exists
    SELECT id INTO existing_franchise_id
    FROM franchises 
    WHERE name = 'AK Restaurant';

    IF existing_franchise_id IS NULL THEN
        -- Insert new franchise if it doesn't exist
        INSERT INTO franchises (name, address, phone)
        VALUES (
            'AK Restaurant', -- name
            'Chennai', -- address
            '+91-XXXXXXXXXX' -- phone (replace with actual number)
        )
        RETURNING id INTO new_franchise_id;

        -- Insert franchise settings for new franchise
        INSERT INTO franchise_settings (
            franchise_id,
            currency,
            tax_rate,
            default_discount,
            opening_time,
            closing_time,
            timezone,
            menu_categories
        )
        VALUES (
            new_franchise_id,
            'INR',
            0.05, -- 5% tax rate
            0,    -- 0% default discount
            '09:00',
            '23:00',
            'Asia/Kolkata',
            ARRAY[
                'Soups',
                'Premium Starters',
                'Chef''s Special',
                'Arabian Corner',
                'Breads',
                'Signature Biriyani',
                'Gravy Specials',
                'Rice & Noodles',
                'Refreshing Mojitos'
            ]
        );
        
        RAISE NOTICE 'Created new franchise with ID: %', new_franchise_id;
    ELSE
        -- Update existing franchise
        UPDATE franchises 
        SET 
            address = 'Chennai',
            phone = '+91-XXXXXXXXXX',
            updated_at = NOW()
        WHERE id = existing_franchise_id;

        -- Update existing franchise settings
        UPDATE franchise_settings 
        SET 
            currency = 'INR',
            tax_rate = 0.05,
            default_discount = 0,
            opening_time = '09:00',
            closing_time = '23:00',
            timezone = 'Asia/Kolkata',
            menu_categories = ARRAY[
                'Soups',
                'Premium Starters',
                'Chef''s Special',
                'Arabian Corner',
                'Breads',
                'Signature Biriyani',
                'Gravy Specials',
                'Rice & Noodles',
                'Refreshing Mojitos'
            ],
            updated_at = NOW()
        WHERE franchise_id = existing_franchise_id;
        
        RAISE NOTICE 'Updated existing franchise with ID: %', existing_franchise_id;
    END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
    BEGIN
        CREATE POLICY franchise_select_policy ON franchises
            FOR SELECT
            USING (true);  -- Allow read access to all authenticated users
    EXCEPTION 
        WHEN duplicate_object THEN 
            RAISE NOTICE 'Select policy already exists on franchises table';
    END;

    BEGIN
        CREATE POLICY franchise_settings_select_policy ON franchise_settings
            FOR SELECT
            USING (true);  -- Allow read access to all authenticated users
    EXCEPTION 
        WHEN duplicate_object THEN 
            RAISE NOTICE 'Select policy already exists on franchise_settings table';
    END;
END $$;

-- Get the franchise ID
SELECT id, name, created_at, updated_at 
FROM franchises 
WHERE name = 'AK Restaurant';
