# Super Admin (Franchisor) Documentation

## Overview
The super admin (franchisor) interface provides a centralized way to manage all franchises in the network. This includes viewing performance metrics, managing franchises, and monitoring the entire network's operation.

## Features

### 1. Dashboard
- Network-wide overview
- Real-time performance metrics
- Revenue statistics across all franchises
- Active franchises monitoring

### 2. Franchise Management
- Create new franchises
- Manage franchise settings
- View and update franchise details
- Monitor individual franchise performance

### 3. Access Control
- Super admin access is managed at the database level
- Only super_admin role can access franchisor features
- Role-based access control for all operations

## Setup

### 1. Creating a Super Admin
```sql
-- Run as database administrator
INSERT INTO staff (
  franchise_id,
  full_name,
  email,
  role,
  status,
  can_manage_staff,
  can_modify_menu,
  can_view_reports
) VALUES (
  'main_franchise_id',
  'Super Admin Name',
  'superadmin@example.com',
  'super_admin',
  'active',
  true,
  true,
  true
);
```

### 2. Accessing Super Admin Panel
1. Log in with super admin credentials
2. Navigate to `/super-admin`
3. Access franchise management and monitoring tools

## Database Structure

### Views
- `franchise_overview`: Aggregated franchise data
- Custom statistics functions for performance metrics

### Security
- Row Level Security (RLS) policies ensure data isolation
- Super admin has read access to all franchise data
- Write operations are controlled through functions

## API Reference

### Franchisor Service
```typescript
franchisorService.getFranchiseOverview()
franchisorService.getFranchiseStats(timeRange)
franchisorService.getFranchiseById(id)
franchisorService.createFranchise(data)
franchisorService.updateFranchise(id, data)
```

## Implementation Notes

### 1. Error Handling
All operations are wrapped in try-catch blocks with:
- Custom error types
- Proper error messages
- Error logging

### 2. Type Safety
- Database types are defined in `types/database.types.ts`
- Frontend types in `types/franchise.ts`
- Type-safe service layer

### 3. UI Components
- `SuperAdminLayout`: Main layout with navigation
- `Dashboard`: Network overview
- `Franchises`: Franchise management
- `FranchiseForm`: Create/Edit franchises

## Routes
```
/super-admin
├── /                 # Dashboard
├── /franchises      # List all franchises
├── /franchises/new  # Create new franchise
└── /franchises/:id  # View/Edit franchise
```

## Best Practices

1. Always use transactions for related operations
2. Validate data before database operations
3. Maintain audit logs for important changes
4. Use proper error handling and reporting
5. Keep security policies up to date

## Security Considerations

1. Role validation on every request
2. Data access through RLS policies
3. Input validation on all operations
4. Audit logging for sensitive operations
5. Regular security review of access patterns

## Maintenance

1. Regular backup of franchise data
2. Monitor database performance
3. Review and update security policies
4. Keep documentation updated
5. Regular testing of backup and restore procedures