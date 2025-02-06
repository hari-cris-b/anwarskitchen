# Franchise Management Guide

## Overview
This guide covers all the franchise management features available in the POS system for Anwar's Kitchen franchises.

## Available Methods

### 1. Franchise Core Operations

```typescript
// Create a new franchise
const newFranchise = await franchiseService.createFranchise({
  name: "Anwar's Kitchen - Koramangala",
  address: "123 Main St",
  city: "Bangalore",
  // ... other franchise details
});

// Get franchise details
const franchise = await franchiseService.getFranchise(franchiseId);

// Update franchise information
await franchiseService.updateFranchise(franchiseId, {
  contact_number: "9876543210",
  email: "koramangala@anwarskitchen.com"
});
```

### 2. Settings Management

```typescript
// Get franchise settings
const settings = await franchiseService.getFranchiseSettings(franchiseId);

// Update settings
await franchiseService.updateFranchiseSettings(franchiseId, {
  tax_rate: 7.5,
  opening_time: "08:00",
  closing_time: "23:00"
});
```

### 3. Brand Compliance and Auditing

```typescript
// Create a new audit report
await franchiseService.createBrandAudit({
  franchise_id: franchiseId,
  audit_date: new Date(),
  food_quality_score: 9.5,
  service_score: 9.0,
  cleanliness_score: 9.2,
  brand_standards_score: 9.3,
  overall_score: 9.25,
  notes: "Excellent maintenance of brand standards"
});

// Get audit history
const audits = await franchiseService.getBrandAudits(franchiseId);
```

### 4. Sales and Performance Reporting

```typescript
// Generate sales report
const report = await franchiseService.generateSalesReport(
  franchiseId,
  startDate,
  endDate
);

// Report includes:
// - Total sales
// - Number of orders
// - Average order value
// - Royalty amount
```

### 5. Staff Management

```typescript
// Get all staff members
const staff = await franchiseService.getFranchiseStaff(franchiseId);

// Add new staff member
await franchiseService.addStaffMember({
  franchise_id: franchiseId,
  email: "staff@example.com",
  role: "staff",
  full_name: "John Doe"
});
```

### 6. Agreement Management

```typescript
// Update franchise agreement
await franchiseService.updateAgreement(franchiseId, {
  agreement_start_date: new Date(),
  agreement_end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 5)),
  royalty_percentage: 5,
  security_deposit: 500000
});

// Check agreement status
const status = await franchiseService.checkAgreementStatus(franchiseId);
// Returns: { status: 'active' | 'expired' | 'expiring_soon', daysRemaining?: number }
```

## Common Workflows

### 1. Setting Up a New Franchise

```typescript
// 1. Create franchise record
const franchise = await franchiseService.createFranchise({
  name: "Anwar's Kitchen - Location",
  // ... franchise details
});

// 2. Settings will be automatically created with defaults
const settings = await franchiseService.getFranchiseSettings(franchise.id);

// 3. Update agreement details
await franchiseService.updateAgreement(franchise.id, {
  // ... agreement details
});

// 4. Add initial staff members
await franchiseService.addStaffMember({
  franchise_id: franchise.id,
  // ... manager details
});
```

### 2. Regular Performance Monitoring

```typescript
// 1. Generate monthly sales report
const monthlyReport = await franchiseService.generateSalesReport(
  franchiseId,
  firstDayOfMonth,
  lastDayOfMonth
);

// 2. Conduct regular audit
await franchiseService.createBrandAudit({
  franchise_id: franchiseId,
  // ... audit scores
});

// 3. Check agreement status
const agreementStatus = await franchiseService.checkAgreementStatus(franchiseId);
```

## Best Practices

1. **Regular Monitoring**
   - Generate sales reports monthly
   - Conduct brand audits quarterly
   - Check agreement status monthly

2. **Data Validation**
   - Always validate data before creating/updating records
   - Use proper date formats
   - Ensure numeric values are within acceptable ranges

3. **Error Handling**
   ```typescript
   try {
     await franchiseService.updateFranchiseSettings(franchiseId, updates);
   } catch (error) {
     if (error.code === '42501') {
       // Handle permission errors
     } else {
       // Handle other errors
     }
   }
   ```

## Security Considerations

1. All methods require proper authentication
2. Operations are restricted by role-based access control
3. Data is isolated between franchises
4. Sensitive operations are logged for audit trails

## Support

For technical support or questions about the franchise management system:
1. Check the documentation in the /docs folder
2. Contact the development team
3. Submit issues through the support system