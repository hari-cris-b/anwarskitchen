# Franchise Tables Guide

## 1. franchises Table

### Current Use Cases
1. **Franchise Identity Management**
   - Store legal business information (name, GST number)
   - Maintain contact details
   - Track franchise status
   - Manage locations

### Current Fields
```sql
id UUID PRIMARY KEY
name TEXT
address TEXT
city TEXT
state TEXT
pincode TEXT
contact_number TEXT
email TEXT
owner_name TEXT
gst_number TEXT
is_active BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
```

### Proposed Future Enhancements
1. **Multiple Location Support**
   ```sql
   -- Add fields for chain management
   parent_franchise_id UUID
   is_headquarters BOOLEAN
   branch_code TEXT
   ```

2. **Enhanced Contact Management**
   ```sql
   -- Add fields for multiple contacts
   alternate_contact TEXT
   emergency_contact TEXT
   website_url TEXT
   social_media_handles JSONB
   ```

3. **Business Details**
   ```sql
   -- Add fields for business operations
   business_type TEXT
   license_number TEXT
   license_expiry DATE
   pan_number TEXT
   bank_details JSONB
   ```

4. **Operational Tracking**
   ```sql
   -- Add fields for operation management
   last_audit_date DATE
   next_audit_date DATE
   compliance_status TEXT
   rating NUMERIC(2,1)
   ```

## 2. franchise_settings Table

### Current Use Cases
1. **Operational Configuration**
   - Currency and tax settings
   - Business hours
   - Discount configurations
   - Menu category management

### Current Fields
```sql
id UUID PRIMARY KEY
franchise_id UUID
currency TEXT
tax_rate NUMERIC
default_discount NUMERIC
opening_time TIME
closing_time TIME
timezone TEXT
menu_categories TEXT[]
created_at TIMESTAMP
updated_at TIMESTAMP
```

### Proposed Future Enhancements
1. **Advanced Pricing**
   ```sql
   -- Add fields for complex pricing
   happy_hour_settings JSONB
   special_day_rates JSONB
   seasonal_pricing_rules JSONB
   bulk_discount_tiers JSONB
   ```

2. **Extended Operating Hours**
   ```sql
   -- Add fields for flexible timing
   operating_days TEXT[]
   holiday_calendar JSONB
   break_times JSONB[]
   custom_hours_by_day JSONB
   ```

3. **Tax Configuration**
   ```sql
   -- Add fields for detailed tax management
   tax_rules JSONB
   tax_holiday_dates DATE[]
   special_tax_categories JSONB
   tax_exemption_rules JSONB
   ```

4. **Menu Management**
   ```sql
   -- Add fields for advanced menu control
   menu_rotation_schedule JSONB
   inactive_categories TEXT[]
   category_display_order INTEGER[]
   menu_themes JSONB
   ```

5. **Payment Settings**
   ```sql
   -- Add fields for payment handling
   accepted_payment_methods TEXT[]
   payment_gateway_configs JSONB
   split_billing_allowed BOOLEAN
   credit_limit_settings JSONB
   ```

6. **Service Configuration**
   ```sql
   -- Add fields for service management
   table_management_config JSONB
   reservation_settings JSONB
   delivery_zone_config JSONB
   service_charge_rules JSONB
   ```

## Implementation Guide

### For New Features

1. **Adding New Fields**
   ```sql
   -- Example migration
   ALTER TABLE franchises
   ADD COLUMN IF NOT EXISTS parent_franchise_id UUID REFERENCES franchises(id),
   ADD COLUMN IF NOT EXISTS is_headquarters BOOLEAN DEFAULT false;
   ```

2. **Updating Existing Records**
   ```sql
   -- Set default values for new fields
   UPDATE franchises
   SET is_headquarters = true
   WHERE parent_franchise_id IS NULL;
   ```

3. **Adding New Constraints**
   ```sql
   -- Add validation constraints
   ALTER TABLE franchise_settings
   ADD CONSTRAINT valid_tax_rate 
   CHECK (tax_rate >= 0 AND tax_rate <= 100);
   ```

### Migration Considerations

1. **Data Migration**
   - Backup existing data before migrations
   - Plan for downtime during major structure changes
   - Provide rollback scripts

2. **Application Updates**
   - Update TypeScript interfaces
   - Modify API endpoints
   - Update UI components

3. **Testing**
   - Test data migration scripts
   - Verify application functionality
   - Check performance impact

## Best Practices

1. **Data Integrity**
   - Use foreign key constraints
   - Implement proper indexing
   - Maintain audit trails

2. **Performance**
   - Monitor table sizes
   - Index frequently queried fields
   - Consider partitioning for large datasets

3. **Security**
   - Maintain RLS policies
   - Encrypt sensitive data
   - Regular security audits

4. **Maintenance**
   - Regular backup scheduling
   - Performance monitoring
   - Data archival strategy