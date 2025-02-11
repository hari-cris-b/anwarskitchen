# Settings Usage Guide

This guide demonstrates how settings configured in the Settings page affect other components in the application.

## Helper Functions

All settings-related operations should use the helper functions from `src/utils/settingsHelpers.ts`:

```tsx
import {
  isBusinessOpen,
  calculateTotalWithTax,
  getNextInvoiceNumber,
  shouldPrintToKitchen,
  getThemeStyles,
  getAcceptedPaymentMethods,
  getReceiptConfig,
  getBusinessInfo
} from '../utils/settingsHelpers';
```

## Component Examples

### Menu.tsx
```tsx
const { settings, formatCurrency } = useFranchise();

// Use helper functions for consistent behavior
const styles = getThemeStyles(settings);
const { tax, total } = calculateTotalWithTax(item.price, settings);

// Apply theme styles
const buttonStyle = {
  backgroundColor: styles.primary,
  color: styles.secondary
};

// Format prices consistently
const displayPrice = formatCurrency(total);
```

### Orders.tsx
```tsx
const { settings } = useFranchise();

// Check if business is open before accepting orders
if (!isBusinessOpen(settings)) {
  throw new Error('Restaurant is currently closed');
}

// Get valid payment methods
const paymentMethods = getAcceptedPaymentMethods(settings);

// Get next invoice number
const invoiceNo = getNextInvoiceNumber(settings);

// Get receipt configuration
const receiptConfig = getReceiptConfig(settings);

// Print receipt if configured
if (shouldPrintToKitchen(settings)) {
  const printerConfig = getPrinterConfig(settings);
  await printReceipt(order, printerConfig, receiptConfig);
}
```

### Kitchen.tsx
```tsx
const { settings } = useFranchise();

// Get business information
const businessInfo = getBusinessInfo(settings);

// Get business hours
const { monday, tuesday /* etc */ } = getFormattedBusinessHours(settings);

// Check if notification should be shown
if (shouldShowNotification('order_alerts', settings)) {
  showNotification('New Order');
}

// Check printer configuration
if (shouldPrintToKitchen(settings)) {
  const config = getPrinterConfig(settings);
  printKitchenOrder(order, config);
}
```

## Settings Validation

Always validate settings before using them:

```tsx
// Validate business hours
const hoursValid = validateBusinessHours(settings.business_hours);

// Check if specific day is configured
const isMondayConfigured = isDayConfigured(settings, 'monday');

// Ensure required settings exist
if (!settings.business_name || !settings.tax_rate) {
  throw new Error('Required settings not configured');
}
```

## Theme Integration

Use CSS variables for consistent theming:

```css
:root {
  --primary-color: var(--theme-primary, #FFA500);
  --secondary-color: var(--theme-secondary, #FFD700);
}
```

```tsx
// Apply theme in components
useEffect(() => {
  const styles = getThemeStyles(settings);
  Object.entries(styles.cssVars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
}, [settings.theme]);
```

## Best Practices

1. Always use helper functions instead of accessing settings directly
2. Check business hours before processing orders
3. Validate printer settings before print attempts
4. Handle notification preferences consistently
5. Use theme variables through getThemeStyles
6. Format currency using the formatCurrency function
7. Validate settings before using them
8. Use type-safe day names from DayOfWeek type
9. Handle null values appropriately
10. Keep receipt configuration consistent across components

## Settings Dependencies

Component | Required Settings | Optional Settings
----------|------------------|------------------
Menu | currency, tax_rate | theme
Orders | business_hours, tax_rate | printer_config
Kitchen | printer_config | notification_settings
POS | business_hours, payment_methods | theme
Profile | business_info | -
Reports | currency, tax_rate | notification_settings
