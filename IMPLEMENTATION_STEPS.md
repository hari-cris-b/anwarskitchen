# Implementation Steps for Anwar's Kitchen Franchise System

## Phase 1: Database Enhancements

### 1. Franchise Core Table Updates
```sql
-- Add new columns to franchises table
ALTER TABLE franchises
ADD COLUMN franchise_code TEXT UNIQUE,
ADD COLUMN agreement_start_date DATE,
ADD COLUMN agreement_end_date DATE,
ADD COLUMN royalty_percentage DECIMAL(5,2),
ADD COLUMN security_deposit DECIMAL(10,2),
ADD COLUMN brand_audit_score DECIMAL(3,1),
ADD COLUMN last_audit_date TIMESTAMP;

-- Add validation constraints
ALTER TABLE franchises
ADD CONSTRAINT valid_royalty CHECK (royalty_percentage >= 0 AND royalty_percentage <= 100),
ADD CONSTRAINT valid_audit_score CHECK (brand_audit_score >= 0 AND brand_audit_score <= 10),
ADD CONSTRAINT valid_agreement_dates CHECK (agreement_start_date <= agreement_end_date);

-- Create index for faster lookups
CREATE INDEX idx_franchise_code ON franchises(franchise_code);
```

### 2. Settings Enhancements
```sql
-- Add new columns to franchise_settings
ALTER TABLE franchise_settings
ADD COLUMN standardized_menu_items JSONB DEFAULT '[]',
ADD COLUMN custom_menu_items JSONB DEFAULT '[]',
ADD COLUMN pricing_variations JSONB DEFAULT '{}',
ADD COLUMN delivery_settings JSONB DEFAULT '{}',
ADD COLUMN pos_configurations JSONB DEFAULT '{}',
ADD COLUMN loyalty_program_settings JSONB DEFAULT '{}';

-- Add validation triggers
CREATE OR REPLACE FUNCTION validate_menu_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure standardized menu items are present
  IF NEW.standardized_menu_items IS NULL OR NEW.standardized_menu_items::text = '[]' THEN
    RAISE EXCEPTION 'Standardized menu items cannot be empty';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_standard_menu
BEFORE INSERT OR UPDATE ON franchise_settings
FOR EACH ROW EXECUTE FUNCTION validate_menu_items();
```

## Phase 2: Application Updates

### 1. Backend Service Updates

```typescript
// Update FranchiseService
interface FranchiseDetails {
  franchise_code: string;
  agreement_start_date: Date;
  agreement_end_date: Date;
  royalty_percentage: number;
  security_deposit: number;
  brand_audit_score?: number;
  last_audit_date?: Date;
  // ... existing fields
}

// Add methods for franchise management
class FranchiseService {
  async createFranchise(details: FranchiseDetails) {
    // Implementation
  }

  async updateFranchiseSettings(franchiseId: string, settings: any) {
    // Implementation
  }

  async calculateRoyalty(franchiseId: string, period: { start: Date; end: Date }) {
    // Implementation
  }

  async performBrandAudit(franchiseId: string, auditData: any) {
    // Implementation
  }
}
```

### 2. Frontend Updates

1. **Franchise Management Pages**
   - Franchise details view/edit
   - Agreement management
   - Performance dashboard
   - Brand compliance tracking

2. **POS System Updates**
   - Standardized menu implementation
   - Custom menu items with approval workflow
   - Pricing controls within allowed variations
   - Royalty calculation and reporting

## Phase 3: Reporting System

### 1. Sales Reporting
```sql
CREATE TABLE sales_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID REFERENCES franchises(id),
    report_date DATE,
    daily_sales NUMERIC(10,2),
    royalty_amount NUMERIC(10,2),
    transaction_count INTEGER,
    average_ticket_size NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 2. Brand Compliance Reporting
```sql
CREATE TABLE compliance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID REFERENCES franchises(id),
    audit_date DATE,
    food_quality_score DECIMAL(3,1),
    service_score DECIMAL(3,1),
    cleanliness_score DECIMAL(3,1),
    brand_standards_score DECIMAL(3,1),
    overall_score DECIMAL(3,1),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Phase 4: Integration Features

1. **Real-time Updates**
   - Sales data synchronization
   - Inventory level monitoring
   - Performance metrics tracking

2. **Automated Notifications**
   - Agreement expiration alerts
   - Audit scheduling reminders
   - Performance threshold alerts
   - Royalty payment reminders

## Security Considerations

1. **Data Isolation**
```sql
-- Update RLS policies
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;

CREATE POLICY franchise_isolation ON franchises
    FOR ALL
    USING (
        CASE 
            WHEN auth.role() = 'super_admin' THEN TRUE
            WHEN auth.role() = 'franchise_owner' THEN id = auth.franchise_id()
            ELSE FALSE
        END
    );
```

2. **Audit Logging**
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID REFERENCES franchises(id),
    action_type TEXT,
    action_details JSONB,
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Testing Plan

1. **Database Testing**
   - Data integrity checks
   - Performance testing
   - Security policy validation

2. **Application Testing**
   - Franchise creation workflow
   - Settings management
   - Reporting accuracy
   - User permission validation

## Deployment Strategy

1. **Pre-deployment**
   - Backup existing data
   - Prepare rollback scripts
   - Update documentation

2. **Deployment Steps**
   - Apply database migrations
   - Deploy application updates
   - Verify security policies
   - Test integration points

3. **Post-deployment**
   - Monitor system performance
   - Gather user feedback
   - Address any issues
   - Update documentation