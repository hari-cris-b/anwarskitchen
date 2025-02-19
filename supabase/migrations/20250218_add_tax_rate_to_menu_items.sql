-- Add tax_rate column to menu_items if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'menu_items' 
        AND column_name = 'tax_rate'
    ) THEN
        ALTER TABLE menu_items
        ADD COLUMN tax_rate NUMERIC DEFAULT 0.0;
    END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_menu_items_tax_rate ON menu_items(tax_rate);

-- Update existing records to have a default tax rate if needed
UPDATE menu_items
SET tax_rate = 0.0
WHERE tax_rate IS NULL;