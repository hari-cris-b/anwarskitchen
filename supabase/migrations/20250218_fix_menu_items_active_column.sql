-- Ensure is_active column exists with correct constraints
DO $$ 
BEGIN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'menu_items' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE menu_items
        ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- Update any null values
    UPDATE menu_items 
    SET is_active = true 
    WHERE is_active IS NULL;

    -- Add NOT NULL constraint if it doesn't exist
    ALTER TABLE menu_items
    ALTER COLUMN is_active SET NOT NULL;

    -- Recreate the index to ensure it exists
    DROP INDEX IF EXISTS idx_menu_items_availability;
    CREATE INDEX idx_menu_items_availability 
    ON menu_items(is_available, is_active);

END $$;