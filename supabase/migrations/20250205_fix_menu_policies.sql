-- Drop existing policies if any
DROP POLICY IF EXISTS "menu_items_select_policy" ON menu_items;
DROP POLICY IF EXISTS "menu_items_insert_policy" ON menu_items;
DROP POLICY IF EXISTS "menu_items_update_policy" ON menu_items;

-- Enable RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Create policies for menu_items
CREATE POLICY "menu_items_select_policy" ON menu_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.franchise_id = menu_items.franchise_id
        )
    );

CREATE POLICY "menu_items_insert_policy" ON menu_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.franchise_id = menu_items.franchise_id
            AND p.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "menu_items_update_policy" ON menu_items
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.franchise_id = menu_items.franchise_id
            AND p.role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.franchise_id = menu_items.franchise_id
            AND p.role IN ('admin', 'manager')
        )
    );