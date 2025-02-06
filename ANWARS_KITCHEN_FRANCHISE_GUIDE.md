# Anwar's Kitchen (AK) Franchise Management System

## System Overview

This POS system is specifically designed for Anwar's Kitchen franchise owners (investors) to manage their restaurant operations. The system provides comprehensive tools for day-to-day restaurant management while maintaining brand consistency and reporting capabilities.

## Franchise Structure

### Main Brand (Anwar's Kitchen)
- Original restaurant brand
- Provides franchise opportunities to investors
- Will have separate management dashboard (future development)
- Access to consolidated sales and performance data
- Brand standard maintenance

### Franchise Owners (Investors)
- Licensed operators of AK branches
- Full access to POS system for their location
- Comprehensive business management tools
- Performance tracking and reporting

## Database Structure

### 1. franchises Table (Core Franchise Information)

```sql
-- Current Structure
CREATE TABLE franchises (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,               -- "Anwar's Kitchen - [Location]"
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    email TEXT NOT NULL,
    owner_name TEXT NOT NULL,         -- Franchise investor's name
    gst_number TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Proposed Additions
ALTER TABLE franchises ADD COLUMN franchise_code TEXT UNIQUE;        -- Unique identifier for each franchise
ALTER TABLE franchises ADD COLUMN agreement_start_date DATE;         -- Franchise agreement start date
ALTER TABLE franchises ADD COLUMN agreement_end_date DATE;          -- Franchise agreement end date
ALTER TABLE franchises ADD COLUMN royalty_percentage DECIMAL(5,2);   -- Agreed royalty percentage
ALTER TABLE franchises ADD COLUMN security_deposit DECIMAL(10,2);    -- Security deposit amount
ALTER TABLE franchises ADD COLUMN brand_audit_score DECIMAL(3,1);    -- Latest brand compliance score
ALTER TABLE franchises ADD COLUMN last_audit_date TIMESTAMP;        -- Last brand audit date
```

### 2. franchise_settings Table (Operational Settings)

```sql
-- Current Structure
CREATE TABLE franchise_settings (
    id UUID PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id),
    currency TEXT DEFAULT 'INR',
    tax_rate NUMERIC(5,2),
    default_discount NUMERIC(5,2),
    opening_time TIME,
    closing_time TIME,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    menu_categories TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Proposed Additions
ALTER TABLE franchise_settings ADD COLUMN standardized_menu_items JSONB;    -- AK's standard menu items
ALTER TABLE franchise_settings ADD COLUMN custom_menu_items JSONB;          -- Location-specific items
ALTER TABLE franchise_settings ADD COLUMN pricing_variations JSONB;         -- Allowed price variations
ALTER TABLE franchise_settings ADD COLUMN delivery_settings JSONB;          -- Delivery service configuration
ALTER TABLE franchise_settings ADD COLUMN pos_configurations JSONB;         -- POS-specific settings
ALTER TABLE franchise_settings ADD COLUMN loyalty_program_settings JSONB;   -- Customer loyalty settings
```

## Key Features for Franchise Owners

1. **Menu Management**
   - Access to standardized AK menu
   - Ability to add location-specific items (with approval)
   - Price variation within allowed ranges
   - Category management

2. **Operations Management**
   - Daily sales tracking
   - Inventory management
   - Staff management
   - Table management
   - Order processing
   - Payment handling

3. **Financial Management**
   - Sales reporting
   - Royalty calculation
   - Tax management
   - Expense tracking
   - Profit analysis

4. **Brand Compliance**
   - Standard operating procedures
   - Quality metrics
   - Service standards
   - Regular audits
   - Performance tracking

5. **Customer Management**
   - Loyalty program
   - Feedback system
   - Customer database
   - Marketing tools

## Future Enhancements

1. **Integration with AK Main Dashboard**
   ```sql
   -- New table for brand-level reporting
   CREATE TABLE brand_level_metrics (
       id UUID PRIMARY KEY,
       franchise_id UUID REFERENCES franchises(id),
       reporting_period DATE,
       sales_data JSONB,
       customer_metrics JSONB,
       quality_metrics JSONB,
       compliance_score DECIMAL(3,1),
       created_at TIMESTAMP WITH TIME ZONE
   );
   ```

2. **Enhanced Franchise Management**
   - Franchise agreement renewal tracking
   - Performance benchmarking
   - Training module integration
   - Inter-franchise communication
   - Resource sharing platform

3. **Advanced Analytics**
   - Sales patterns analysis
   - Customer behavior tracking
   - Inventory optimization
   - Staff performance metrics
   - Market analysis tools

## Implementation Guidelines

1. **Data Migration**
   - Import existing franchise data
   - Set up initial configurations
   - Establish baseline metrics

2. **Security Measures**
   - Role-based access control
   - Data isolation between franchises
   - Audit logging
   - Secure data transmission

3. **Training Requirements**
   - System usage training
   - Brand standards training
   - Operational procedures
   - Reporting requirements

4. **Support Structure**
   - Technical support system
   - Operational support
   - Brand support
   - Training resources

## Benefits

1. **For Franchise Owners**
   - Complete business management solution
   - Brand support and guidelines
   - Performance tracking
   - Growth analytics

2. **For Main Brand (AK)**
   - Standardized operations
   - Quality control
   - Performance monitoring
   - Brand consistency
   - Network-wide analytics

## Next Steps

1. **Short Term**
   - Implement proposed table modifications
   - Set up basic reporting structure
   - Establish brand standards module

2. **Medium Term**
   - Develop AK main dashboard
   - Enhance analytics capabilities
   - Add advanced features

3. **Long Term**
   - Network-wide integration
   - Advanced analytics platform
   - Automated compliance monitoring