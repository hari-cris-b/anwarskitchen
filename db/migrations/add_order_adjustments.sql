-- Add discount and additional charges columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS additional_charges DECIMAL(10,2) DEFAULT 0.00;

-- Update existing orders to have default values
UPDATE orders 
SET discount = 0.00, additional_charges = 0.00 
WHERE discount IS NULL OR additional_charges IS NULL;

-- Add comments to the new columns
COMMENT ON COLUMN orders.discount IS 'The discount amount applied to the order';
COMMENT ON COLUMN orders.additional_charges IS 'Any additional charges applied to the order';

-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name IN ('discount', 'additional_charges');
