# Quick Fix for Website Not Loading

## 1. Run Auto-Diagnosis
```bash
# This will automatically check and fix common issues
psql -f scripts/diagnose.sql

# Then verify all fixes were applied
psql -f src/db/verify_setup.sql
```

## 2. If Still Not Working

### If User Has No Profile:
```sql
-- First, check if profile exists
SELECT * FROM profiles WHERE id = auth.uid();

-- If no profile, create one
INSERT INTO profiles (id, user_id, role)
SELECT auth.uid(), auth.uid(), 'staff'
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid());
```

### If User Has No Franchise:
```sql
-- Check franchise association
SELECT franchise_id FROM profiles WHERE id = auth.uid();

-- Associate with a franchise (use an existing franchise ID)
UPDATE profiles 
SET franchise_id = (SELECT id FROM franchises LIMIT 1)
WHERE id = auth.uid() AND franchise_id IS NULL;
```

### If Missing Permissions:
```sql
-- Grant basic permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE staff TO authenticated;
GRANT SELECT ON TABLE franchises TO authenticated;
GRANT SELECT, UPDATE ON TABLE profiles TO authenticated;

-- Grant enum type usage
GRANT USAGE ON TYPE staff_role TO authenticated;
GRANT USAGE ON TYPE shift_type TO authenticated;
GRANT USAGE ON TYPE status_type TO authenticated;
```

### If RLS Policies Missing:
```sql
-- Create basic policies
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_franchise_access ON staff
FOR ALL TO authenticated
USING (franchise_id IN (
    SELECT franchise_id FROM profiles WHERE id = auth.uid()
));
```

## 3. Cleanup
```bash
# Remove old migration files and use consolidated versions
./scripts/cleanup.sh
```

## 4. Fix Frontend Issues

### Module Export Error
### Issue: "The requested module does not provide an export named 'useFranchise'"

This means you're using the old hook name. Update your imports to:
```typescript
// Change this:
import { useFranchise } from '../contexts/FranchiseContext';

// To this:
import { useFranchiseContext } from '../contexts/FranchiseContext';
```

Or use the provided alias:
```typescript
import { useFranchise } from '../contexts/FranchiseContext';
```

### Verify Data Flow
1. Check browser console errors
2. Verify FranchiseContext has data:
```typescript
console.log('Franchise context:', useContext(FranchiseContext));
```

3. Verify staff data loading:
```typescript
console.log('Staff data:', useStaff());
```

### Issue: "Property 'tax_rate' does not exist on type 'Franchise'"
Make sure you're importing the Franchise type from types/franchise instead of defining it inline:
```typescript
import { Franchise } from '../types/franchise';
```

### Issue: "Type ... is not assignable to parameter of type 'MenuItemCreateDTO'"
Make sure you're providing all required fields when creating/updating menu items:
```typescript
const newItem: MenuItemCreateDTO = {
  franchise_id: profile.franchise_id,
  name: formData.name,
  price: formData.price,
  category: formData.category,
  description: formData.description,
  is_available: formData.is_available,
  tax_rate: formData.tax_rate,
  image_url: formData.image_url || null,
  is_active: formData.is_active ?? true
};
```

## Documentation
- [SETUP.md](docs/SETUP.md) - Detailed setup instructions
- [README.md](README.md) - Project overview and architecture
- [Types Documentation](src/types/) - Type definitions and interfaces
