import { FranchiseSettings } from '../types/franchise';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/**
 * Helper functions for common settings operations used across components
 */

function getCurrentDayName(): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

export function isBusinessOpen(settings: FranchiseSettings): boolean {
  const day = getCurrentDayName();
  const hours = settings.business_hours?.[day];
  
  if (!hours || hours.is_closed) return false;
  
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
  return currentTime >= hours.open && currentTime <= hours.close;
}

export function calculateTotalWithTax(amount: number, settings: FranchiseSettings): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const taxRate = Number(settings.tax_rate || 0) / 100;
  const tax = amount * taxRate;
  
  return {
    subtotal: amount,
    tax,
    total: amount + tax
  };
}

export function getNextInvoiceNumber(settings: FranchiseSettings): string {
  const prefix = settings.printer_config.invoice_prefix || 'INV-';
  const nextNumber = Number(settings.printer_config.next_invoice_number || 1);
  return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
}

export function shouldPrintToKitchen(settings: FranchiseSettings): boolean {
  return Boolean(
    settings.printer_config.print_kitchen_receipts && 
    settings.printer_config.printer_ip &&
    settings.printer_config.printer_port
  );
}

export function getPrinterConfig(settings: FranchiseSettings) {
  return {
    ip: settings.printer_config.printer_ip,
    port: settings.printer_config.printer_port,
    type: settings.printer_config.printer_type,
    paperSize: settings.printer_config.paper_size,
    fontSize: settings.printer_config.font_size
  };
}

export function getThemeStyles(settings: FranchiseSettings) {
  const defaultTheme = {
    primaryColor: '#4F46E5',
    secondaryColor: '#6366F1'
  };
  
  return {
    primary: settings.theme?.primaryColor ?? defaultTheme.primaryColor,
    secondary: settings.theme?.secondaryColor ?? defaultTheme.secondaryColor,
    cssVars: {
      '--primary-color': settings.theme?.primaryColor ?? defaultTheme.primaryColor,
      '--secondary-color': settings.theme?.secondaryColor ?? defaultTheme.secondaryColor,
    }
  };
}

export function getAcceptedPaymentMethods(settings: FranchiseSettings): string[] {
  const methods: string[] = [];
  if (settings.printer_config?.accept_cash) methods.push('cash');
  if (settings.printer_config?.accept_card) methods.push('card');
  if (settings.printer_config?.accept_upi) methods.push('upi');
  return methods;
}

export function validateBusinessHours(hours: FranchiseSettings['business_hours']): boolean {
  if (!hours) return false;
  
  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days.every(day => {
    const dayHours = hours[day];
    if (!dayHours || dayHours.is_closed) return true; // Not configured or closed is valid
    return dayHours.open < dayHours.close; // Ensure open time is before close time
  });
}

export function shouldShowNotification(
  type: keyof FranchiseSettings['notification_settings'],
  settings: FranchiseSettings
): boolean {
  return Boolean(settings.notification_settings?.[type]);
}

export function getReceiptConfig(settings: FranchiseSettings) {
  return {
    showLogo: settings.receipt_template?.show_logo ?? false,
    showGst: settings.receipt_template?.show_gst ?? false,
    showTaxBreakdown: settings.receipt_template?.show_tax_breakdown ?? false,
    header: settings.receipt_header ?? '',
    footer: settings.receipt_footer ?? '',
    gstNumber: settings.gst_number ?? '',
    businessName: settings.business_name ?? '',
    address: settings.address ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
  };
}

export function getBusinessInfo(settings: FranchiseSettings) {
  return {
    name: settings.business_name ?? '',
    type: settings.business_details?.business_type ?? '',
    isChain: settings.business_details?.is_chain_business ?? false,
    seatingCapacity: settings.business_details?.seating_capacity ?? 0,
    contact: {
      phone: settings.phone ?? '',
      email: settings.email ?? '',
      website: settings.business_details?.website ?? ''
    },
    address: {
      full: settings.address ?? '',
      city: settings.business_details?.location?.city ?? '',
      state: settings.business_details?.location?.state ?? '',
      country: settings.business_details?.location?.country ?? '',
      pincode: settings.business_details?.location?.pincode ?? ''
    }
  };
}

export function isDayConfigured(settings: FranchiseSettings, day: DayOfWeek): boolean {
  const hours = settings.business_hours?.[day];
  return Boolean(hours?.open && hours?.close && !hours?.is_closed);
}

export function getFormattedBusinessHours(settings: FranchiseSettings): Record<DayOfWeek, string> {
  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  if (!settings.business_hours) {
    return days.reduce((acc, day) => {
      acc[day] = 'Not configured';
      return acc;
    }, {} as Record<DayOfWeek, string>);
  }
  
  return days.reduce((acc, day) => {
    const hours = settings.business_hours![day];
    if (!hours || hours.is_closed) {
      acc[day] = 'Closed';
    } else {
      acc[day] = `${hours.open} - ${hours.close}`;
    }
    return acc;
  }, {} as Record<DayOfWeek, string>);
}
