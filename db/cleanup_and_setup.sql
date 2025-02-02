-- First, let's check existing data
SELECT f.id as franchise_id, f.name, fs.id as settings_id 
FROM franchises f 
LEFT JOIN franchise_settings fs ON f.id = fs.franchise_id
WHERE f.name = 'AK Restaurant';

-- Clean up existing data
DO $$ 
BEGIN
    -- Delete existing franchise settings
    DELETE FROM franchise_settings 
    WHERE franchise_id IN (SELECT id FROM franchises WHERE name = 'AK Restaurant');
    
    -- Delete existing franchise
    DELETE FROM franchises 
    WHERE name = 'AK Restaurant';
    
    -- Now insert fresh data
    DECLARE
        new_franchise_id UUID;
    BEGIN
        -- Insert new franchise
        INSERT INTO franchises (name, address, phone)
        VALUES (
            'AK Restaurant',
            'Chennai',
            '+91-XXXXXXXXXX'
        )
        RETURNING id INTO new_franchise_id;

        -- Delete existing franchise settings again to ensure they are deleted before inserting new ones
        DELETE FROM franchise_settings 
        WHERE franchise_id = new_franchise_id;
        
        -- Insert new franchise settings
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
            0.05,
            0,
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
    END;
END $$;

-- Verify the new setup
SELECT f.id as franchise_id, f.name, f.address, f.phone, 
       fs.currency, fs.tax_rate, fs.menu_categories
FROM franchises f 
JOIN franchise_settings fs ON f.id = fs.franchise_id
WHERE f.name = 'AK Restaurant';
