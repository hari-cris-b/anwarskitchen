-- Begin transaction
BEGIN;

-- Add receipt columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'franchise_settings' 
                  AND column_name = 'receipt_header') THEN
        ALTER TABLE franchise_settings ADD COLUMN receipt_header text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'franchise_settings' 
                  AND column_name = 'receipt_footer') THEN
        ALTER TABLE franchise_settings ADD COLUMN receipt_footer text;
    END IF;
END $$;

-- Update type definitions to include new columns
COMMENT ON COLUMN franchise_settings.receipt_header IS 'Custom text to display at the top of receipts';
COMMENT ON COLUMN franchise_settings.receipt_footer IS 'Custom text to display at the bottom of receipts';

COMMIT;