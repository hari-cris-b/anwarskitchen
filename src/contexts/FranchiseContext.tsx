import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

/**
 * FranchiseProvider manages global settings that affect all components:
 * 
 * Currency & Tax:
 * - formatCurrency: Used by Menu.tsx and Orders.tsx for consistent price formatting
 * - tax_rate: Used in Orders.tsx for calculating totals
 * 
 * Example:
 * ```tsx
 * const { formatCurrency, settings } = useFranchise();
 * const price = formatCurrency(100);  // "₹100.00"
 * const tax = parseFloat(settings.tax_rate);
 * ```
 * 
 * Business Hours:
 * - Used to validate operations timing in Orders.tsx and POS.tsx
 * 
 * Example:
 * ```tsx
 * const { settings } = useFranchise();
 * const currentHours = settings.business_hours[currentDay];
 * const isOpen = checkBusinessHours(currentHours);
 * ```
 * 
 * Theme:
 * - Applied globally for consistent branding across all components
 * 
 * Example:
 * ```tsx
 * const { settings } = useFranchise();
 * const styles = {
 *   backgroundColor: settings.theme.primaryColor,
 *   color: settings.theme.secondaryColor
 * };
 * ```
 * 
 * Printer Settings:
 * - Controls receipt printing behavior in Orders.tsx and Kitchen.tsx
 * 
 * Example:
 * ```tsx
 * const { settings } = useFranchise();
 * if (settings.printer_config.auto_print_orders) {
 *   printReceipt(order);
 * }
 * ```
 * 
 * Notification Settings:
 * - Manages alerts and notifications across all components
 * 
 * Example:
 * ```tsx
 * const { settings } = useFranchise();
 * if (settings.notification_settings.order_alerts) {
 *   showNotification('New Order Received');
 * }
 * ```
 */

export interface Theme {
  primaryColor: string;
  secondaryColor: string;
}

export interface BusinessHours {
  monday?: { open: string; close: string };
  tuesday?: { open: string; close: string };
  wednesday?: { open: string; close: string };
  thursday?: { open: string; close: string };
  friday?: { open: string; close: string };
  saturday?: { open: string; close: string };
  sunday?: { open: string; close: string };
}

export interface PrinterConfig {
  printer_type?: string;
  paper_size?: string;
  font_size?: string;
  printer_ip?: string;
  printer_port?: string;
  auto_print_orders?: boolean;
  print_kitchen_receipts?: boolean;
  invoice_prefix?: string;
  accept_cash?: boolean;
  accept_card?: boolean;
  accept_upi?: boolean;
  next_invoice_number?: number;
}

export interface BrandAssets {
  fonts: {
    primary: string;
    secondary: string;
  };
  images: {
    favicon: string | null;
    login_background: string | null;
  };
}

export interface ReceiptTemplate {
  show_logo: boolean;
  show_gst: boolean;
  show_tax_breakdown: boolean;
}

export interface NotificationSettings {
  order_alerts: boolean;
  low_inventory_alerts: boolean;
  daily_reports: boolean;
  email_notifications: boolean;
}

export interface FranchiseSettings {
  id: string;
  theme: Theme;
  tax_rate: string;
  currency: string;
  business_hours: BusinessHours;
  printer_config: PrinterConfig;
  created_at: string;
  updated_at: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  website: string | null;
  business_type: string | null;
  seating_capacity: number | null;
  is_chain_business: boolean;
  location_coordinates: any | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  social_media: Record<string, string>;
  logo_url: string | null;
  brand_assets: BrandAssets;
  receipt_footer: string | null;
  receipt_header: string | null;
  receipt_template: ReceiptTemplate;
  notification_settings: NotificationSettings;
}

interface FranchiseContextType {
  settings: FranchiseSettings | null;
  loading: boolean;
  error: string | null;
  formatCurrency: (amount: number) => string;
  updateSettings: (settings: Partial<FranchiseSettings>) => Promise<void>;
}

const FranchiseContext = createContext<FranchiseContextType>({
  settings: null,
  loading: true,
  error: null,
  formatCurrency: (amount: number) => `₹${amount.toFixed(2)}`,
  updateSettings: async () => {}
});

export const useFranchise = () => useContext(FranchiseContext);

export function FranchiseProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<FranchiseSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  const formatCurrency = useCallback((amount: number): string => {
    if (!settings || !settings.currency) {
      return `₹${amount.toFixed(2)}`;
    }

    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: settings.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (err) {
      console.error('Error formatting currency:', err);
      return `${settings.currency} ${amount.toFixed(2)}`;
    }
  }, [settings]);

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      if (!profile?.franchise_id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .rpc('get_user_profile', { user_id: profile.id });

        if (!isMounted) return;

        if (profileError) throw profileError;

        const { data, error: fetchError } = await supabase
          .from('franchise_settings')
          .select('*')
          .eq('id', profile.franchise_id)
          .single();

        if (!isMounted) return;

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            const { data: newSettings, error: createError } = await supabase
              .from('franchise_settings')
              .insert({
                id: profile.franchise_id,
                business_name: 'Default Franchise',
                currency: 'INR',
                tax_rate: '5.00',
                theme: {
                  primaryColor: '#FFA500',
                  secondaryColor: '#FFD700'
                },
                business_hours: {
                  monday: { open: '09:00', close: '22:00' }
                },
                printer_config: {},
                brand_assets: {
                  fonts: {
                    primary: 'Inter',
                    secondary: 'Roboto'
                  },
                  images: {
                    favicon: null,
                    login_background: null
                  }
                },
                receipt_template: {
                  show_logo: true,
                  show_gst: true,
                  show_tax_breakdown: true
                },
                notification_settings: {
                  order_alerts: true,
                  low_inventory_alerts: true,
                  daily_reports: true,
                  email_notifications: true
                },
                is_chain_business: false,
                social_media: {}
              })
              .select()
              .single();

            if (!isMounted) return;

            if (createError) throw createError;
            setSettings(newSettings);
          } else {
            throw fetchError;
          }
        } else {
          if (isMounted) {
            setSettings(data);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error loading franchise settings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load franchise settings');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, [profile?.franchise_id, profile?.id]);

  const updateSettings = useCallback(async (newSettings: Partial<FranchiseSettings>) => {
    if (!profile?.franchise_id) {
      throw new Error('No franchise ID available');
    }

    const { error } = await supabase
      .from('franchise_settings')
      .update(newSettings)
      .eq('id', profile.franchise_id);

    if (error) throw error;

    // Update local state
    setSettings(prev => prev ? { ...prev, ...newSettings } : null);
  }, [profile?.franchise_id]);

  const contextValue = React.useMemo(() => ({
    settings,
    loading,
    error,
    formatCurrency,
    updateSettings
  }), [settings, loading, error, formatCurrency, updateSettings]);

  return (
    <FranchiseContext.Provider value={contextValue}>
      {children}
    </FranchiseContext.Provider>
  );
}

export default FranchiseProvider;
