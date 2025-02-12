# Staff Management System

## Quick Setup

1. Clean up old migrations:
```bash
chmod +x scripts/cleanup.sh
./scripts/cleanup.sh
```

2. Set up the database:
```bash
# Run migrations in order
psql -f supabase/migrations/20240212000000_setup_staff.sql
psql -f supabase/migrations/20240212000001_setup_profiles.sql

# Verify setup
psql -f src/db/verify_setup.sql
```

## Known Issues and Solutions

### 1. Type Issues
- **"Property 'tax_rate' does not exist on type 'Franchise'"**  
  Use the proper Franchise type:
  ```typescript
  import { Franchise } from '../types/franchise';
  ```

- **"Type is not assignable to parameter"**  
  Make sure all required fields are provided. See type definitions in `src/types/`.

- **"The requested module does not provide an export named 'useFranchise'"**  
  Use `useFranchiseContext` or the provided alias:
  ```typescript
  import { useFranchiseContext } from '../contexts/FranchiseContext';
  // or
  import { useFranchise } from '../contexts/FranchiseContext';
  ```

### 2. Database Access
If the website isn't loading:
1. Run the auto-diagnosis script:
   ```bash
   psql -f scripts/diagnose.sql
   ```
2. Check QUICKFIX.md for common solutions
3. Verify database setup with verify_setup.sql

## Project Structure
```
├── src/
│   ├── components/          # React components
│   ├── contexts/           # React contexts
│   ├── hooks/             # Custom hooks
│   ├── services/          # API services
│   └── types/             # TypeScript types
├── supabase/
│   └── migrations/        # Database migrations
└── scripts/              # Utility scripts
```

## Development

1. Key Files:
- `src/db/verify_setup.sql` - Database diagnostics
- `docs/SETUP.md` - Detailed setup guide
- `scripts/cleanup.sh` - Clean up utility
- `QUICKFIX.md` - Common issues and fixes

2. Type Checking:
```bash
npm run typecheck
```

## Type System

The project uses strict TypeScript with several key types:

1. Database Types:
   - `DatabaseStaff` - Raw database staff record
   - `StaffRole` - Database staff role enum
   
2. Frontend Types:
   - `UserRole` - Frontend role representation
   - `Staff` - Processed staff member with permissions
   - `Franchise` - Franchise information with settings

3. DTOs:
   - `CreateStaffDTO` - Staff creation data
   - `UpdateStaffDTO` - Staff update data
   - `MenuItemCreateDTO` - Menu item creation data

For detailed type documentation, see [Types Documentation](src/types/).

## Troubleshooting

If you encounter issues:

1. Check browser console for errors
2. Run the verification script:
   ```bash
   psql -f src/db/verify_setup.sql
   ```
3. Refer to QUICKFIX.md for common solutions
4. Verify all types match their expected interfaces
