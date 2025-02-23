# Database Documentation

## Overview

This directory contains comprehensive documentation for the AK-POS database system. The documentation is organized into several focused guides.

## Core Documents

1. [Database Overview](../DATABASE.md)
   - High-level system overview
   - Core components
   - Access levels
   - Security features

2. [Database Setup Guide](DATABASE_SETUP.md)
   - Installation instructions
   - Default accounts
   - Common tasks
   - Troubleshooting

3. [Implementation Details](DATABASE_IMPLEMENTATION.md)
   - Table structures
   - Authentication flow
   - RLS policies
   - Function examples

4. [Super Admin Guide](SUPER_ADMIN.md)
   - Super admin features
   - System management
   - Franchise oversight
   - Security policies

## Quick Links

### Setup
```bash
# Full database rebuild
psql "postgresql://postgres:[password]@localhost:54322/postgres" -f supabase/rebuild.sql

# Verify setup
psql "postgresql://postgres:[password]@localhost:54322/postgres" -f supabase/migrations/20250221_verify_setup.sql
```

### Default Accounts

1. Super Admin
   - Email: harikrish120027@gmail.com
   - Auth ID: e739b600-aa23-4003-a812-82d9ca747638

2. Staff
   - Email: haricrisb@gmail.com
   - Email verified: true

## Directory Structure

```
/
├── DATABASE.md              # High-level overview
├── docs/
│   ├── DATABASE_README.md   # This file
│   ├── DATABASE_SETUP.md    # Setup instructions
│   ├── DATABASE_IMPLEMENTATION.md  # Technical details
│   └── SUPER_ADMIN.md      # Super admin guide
└── supabase/
    ├── README.md           # Supabase setup
    ├── rebuild.sql         # Master rebuild script
    └── migrations/         # Database migrations
```

## Development Workflow

1. **Fresh Setup**
   - Review [Database Overview](../DATABASE.md)
   - Follow [Setup Guide](DATABASE_SETUP.md)
   - Run rebuild script

2. **Making Changes**
   - Create new migration in `supabase/migrations/`
   - Update relevant documentation
   - Test changes
   - Commit both SQL and docs

3. **Troubleshooting**
   - Check [Setup Guide](DATABASE_SETUP.md#troubleshooting)
   - Review logs
   - Run verification scripts

## Key Features

1. **Security**
   - Row Level Security (RLS)
   - Role-based access
   - Email verification
   - Activity logging

2. **Data Management**
   - Franchise system
   - Staff management
   - Order processing
   - Menu management

3. **Monitoring**
   - Activity tracking
   - Performance metrics
   - Error logging
   - Audit trails

## Best Practices

1. **Development**
   - Always use migrations
   - Document schema changes
   - Test RLS policies
   - Verify permissions

2. **Deployment**
   - Backup before changes
   - Use transactions
   - Verify after deploy
   - Monitor performance

3. **Maintenance**
   - Regular backups
   - Log rotation
   - Policy audits
   - Performance checks

## Support

For issues:
1. Check relevant documentation
2. Review error logs
3. Run verification scripts
4. Check [Setup Guide](DATABASE_SETUP.md#troubleshooting)

## Contributing

1. Create new migration file
2. Update relevant documentation
3. Add tests if needed
4. Submit PR with both changes

## Changelog

See [migrations](../supabase/migrations/) for detailed change history.