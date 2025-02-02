-- Insert menu items
DO $$ 
DECLARE
    franchise_id UUID;
    tax_rate NUMERIC := 0.05; -- 5% tax rate, adjust as needed
BEGIN
    -- Get the AK Restaurant franchise ID
    SELECT id INTO franchise_id 
    FROM franchises 
    WHERE name = 'AK Restaurant';

    IF franchise_id IS NULL THEN
        RAISE EXCEPTION 'Franchise not found. Please run setup_franchise.sql first.';
    END IF;

    -- Soups
    INSERT INTO menu_items (id, name, price, category, tax_rate, franchise_id, is_active) VALUES
    (gen_random_uuid(), 'Sweet Corn Chicken Soup', 113, 'Soups', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Hot & Sour Veg Soup', 104, 'Soups', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Hot & Sour Chicken Soup', 123, 'Soups', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Manchow Veg Soup', 132, 'Soups', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Manchow Chicken Soup', 151, 'Soups', tax_rate, franchise_id, true);

    -- Premium Starters with Variants
    -- Salt & Pepper
    INSERT INTO menu_items (id, name, price, category, tax_rate, franchise_id, is_active) VALUES
    (gen_random_uuid(), 'Salt & Pepper Chicken', 161, 'Premium Starters', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Salt & Pepper Prawn', 208, 'Premium Starters', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Salt & Pepper Veg', 142, 'Premium Starters', tax_rate, franchise_id, true);

    -- Singapore Style
    INSERT INTO menu_items (id, name, price, category, tax_rate, franchise_id, is_active) VALUES
    (gen_random_uuid(), 'Singapore Style Chicken', 199, 'Premium Starters', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Singapore Style Prawn', 246, 'Premium Starters', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Singapore Style Veg', 161, 'Premium Starters', tax_rate, franchise_id, true);

    -- Hong Kong Style
    INSERT INTO menu_items (id, name, price, category, tax_rate, franchise_id, is_active) VALUES
    (gen_random_uuid(), 'Hong Kong Style Chicken', 180, 'Premium Starters', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Hong Kong Style Prawn', 227, 'Premium Starters', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Hong Kong Style Veg', 151, 'Premium Starters', tax_rate, franchise_id, true);

    -- Chef's Special
    INSERT INTO menu_items (id, name, price, category, tax_rate, franchise_id, is_active) VALUES
    (gen_random_uuid(), 'Dynamite Chicken', 189, 'Chef''s Special', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Dynamite Prawn', 237, 'Chef''s Special', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Honey Glazed Chicken Wings', 142, 'Chef''s Special', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Dragon Paneer', 132, 'Chef''s Special', tax_rate, franchise_id, true);

    -- Arabian Corner
    INSERT INTO menu_items (id, name, price, category, tax_rate, franchise_id, is_active) VALUES
    (gen_random_uuid(), 'Mixed Grill Platter', 569, 'Arabian Corner', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Tandoori Chicken Full', 379, 'Arabian Corner', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Tandoori Chicken Half', 218, 'Arabian Corner', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Chicken Tikka', 208, 'Arabian Corner', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Malai Tikka', 227, 'Arabian Corner', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Chicken Seekh Kebab', 208, 'Arabian Corner', tax_rate, franchise_id, true);

    -- Breads
    INSERT INTO menu_items (id, name, price, category, tax_rate, franchise_id, is_active) VALUES
    (gen_random_uuid(), 'Plain Naan', 28, 'Breads', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Butter Naan', 48, 'Breads', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Garlic Naan', 66, 'Breads', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Cheese Naan', 86, 'Breads', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Tandoori Roti', 38, 'Breads', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Butter Roti', 57, 'Breads', tax_rate, franchise_id, true);

    -- Signature Biriyani
    INSERT INTO menu_items (id, name, price, category, tax_rate, franchise_id, is_active) VALUES
    (gen_random_uuid(), 'Normal Biriyani', 143, 'Signature Biriyani', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Thokku Special Biriyani', 180, 'Signature Biriyani', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Double Masala Biriyani', 208, 'Signature Biriyani', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Chicken 65 Biriyani', 170, 'Signature Biriyani', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Prawn Biriyani', 237, 'Signature Biriyani', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Plain Biriyani', 85, 'Signature Biriyani', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Offer Biriyani', 219, 'Signature Biriyani', tax_rate, franchise_id, true);

    -- Gravy Specials
    INSERT INTO menu_items (id, name, price, category, tax_rate, franchise_id, is_active) VALUES
    (gen_random_uuid(), 'Chicken Tikka Masala', 170, 'Gravy Specials', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Butter Chicken', 180, 'Gravy Specials', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Egg Masala', 104, 'Gravy Specials', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Kara Punjabi Chicken', 208, 'Gravy Specials', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Prawn Masala', 237, 'Gravy Specials', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Kadai Gobi', 151, 'Gravy Specials', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Kadai Paneer', 151, 'Gravy Specials', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Kadai Mushroom', 151, 'Gravy Specials', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Pepper Chicken', 151, 'Gravy Specials', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Mixed Veg Kadai', 176, 'Gravy Specials', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Paneer Butter Masala', 151, 'Gravy Specials', tax_rate, franchise_id, true);

    -- Rice & Noodles
    INSERT INTO menu_items (id, name, price, category, tax_rate, franchise_id, is_active) VALUES
    (gen_random_uuid(), 'Veg Rice', 132, 'Rice & Noodles', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Veg Noodles', 132, 'Rice & Noodles', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Chicken Rice', 151, 'Rice & Noodles', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Chicken Noodles', 151, 'Rice & Noodles', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Prawn Rice', 199, 'Rice & Noodles', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Prawn Noodles', 199, 'Rice & Noodles', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Mixed Non-Veg Special Rice', 237, 'Rice & Noodles', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Mixed Non-Veg Special Noodles', 237, 'Rice & Noodles', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Chilli-Garlic Chicken Rice', 199, 'Rice & Noodles', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Chilli-Garlic Prawn Rice', 237, 'Rice & Noodles', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Triple Schezwan Rice', 256, 'Rice & Noodles', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Gobi Rice', 132, 'Rice & Noodles', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Mushroom Rice', 132, 'Rice & Noodles', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Paneer Rice', 151, 'Rice & Noodles', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Mixed Veg Rice', 161, 'Rice & Noodles', tax_rate, franchise_id, true);

    -- Refreshing Mojitos
    INSERT INTO menu_items (id, name, price, category, tax_rate, franchise_id, is_active) VALUES
    (gen_random_uuid(), 'Blue Ocean Single', 85, 'Refreshing Mojitos', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Blue Ocean Double', 161, 'Refreshing Mojitos', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Virgin Mojito Single', 66, 'Refreshing Mojitos', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Virgin Mojito Double', 123, 'Refreshing Mojitos', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Strawberry Blast Single', 66, 'Refreshing Mojitos', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Strawberry Blast Double', 123, 'Refreshing Mojitos', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Pomegranate Fresh Single', 75, 'Refreshing Mojitos', tax_rate, franchise_id, true),
    (gen_random_uuid(), 'Pomegranate Fresh Double', 142, 'Refreshing Mojitos', tax_rate, franchise_id, true);

END $$;
