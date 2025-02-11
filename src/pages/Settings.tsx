// src/pages/Settings.tsx

/**
 * Settings Page
 * 
 * This page manages franchise-wide settings that affect multiple components:
 * 
 * 1. Currency & Tax Settings:
 *    - Affects Orders.tsx: Currency display and tax calculations
 *    - Affects Menu.tsx: Price display format
 *    - Affects Kitchen.tsx: Order total displays
 * 
 * 2. Business Hours:
 *    - Affects Orders.tsx: Order acceptance based on operating hours
 *    - Affects POS.tsx: Operating hours validation
 * 
 * 3. Printer Settings:
 *    - Affects Orders.tsx: Auto-printing of receipts
 *    - Affects Kitchen.tsx: Kitchen receipt printing
 * 
 * 4. Theme Settings:
 *    - Applied globally through FranchiseContext
 *    - Affects all components using themed elements
 * 
 * 5. Notification Settings:
 *    - Affects Orders.tsx: New order alerts
 *    - Affects Kitchen.tsx: Order status notifications
 *    - Affects Menu.tsx: Inventory alerts
 * 
 * Changes to settings are immediately reflected across all components
 * through the FranchiseContext's updateSettings function.
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useFranchise } from '../contexts/FranchiseContext';
import { FranchiseSettings } from '../contexts/FranchiseContext';


interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, description, children }) => {
  return (
    <section className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-2">{title}</h2>
      {description && <p className="text-gray-600 mb-4">{description}</p>}
      {children}
    </section>
  );
};

type BusinessHourDay = { open: string; close: string };
type BusinessHours = { [key: string]: BusinessHourDay };

interface Settings extends Omit<FranchiseSettings, 'created_at' | 'updated_at'> {
  business_hours: BusinessHours;
}

const defaultBusinessHours: BusinessHours = {
  monday: { open: '09:00', close: '22:00' },
  tuesday: { open: '09:00', close: '22:00' },
  wednesday: { open: '09:00', close: '22:00' },
  thursday: { open: '09:00', close: '22:00' },
  friday: { open: '09:00', close: '22:00' },
  saturday: { open: '09:00', close: '22:00' },
  sunday: { open: '09:00', close: '22:00' }
};

const defaultSettings: Settings = {
  id: '',
  business_name: '',
  phone: null,
  email: null,
  tax_rate: '0.00',
  currency: 'INR',
  theme: {
    primaryColor: '#FFA500',
    secondaryColor: '#FFD700'
  },
  business_hours: defaultBusinessHours,
  printer_config: {
    printer_type: 'thermal',
    paper_size: '80mm',
    printer_ip: '',
    printer_port: '',
    auto_print_orders: true,
    print_kitchen_receipts: true,
    invoice_prefix: 'INV-',
    next_invoice_number: 1,
    accept_cash: true,
    accept_card: true,
    accept_upi: true,
    font_size: 'normal'
  },
  address: null,
  gst_number: null,
  website: null,
  business_type: null,
  seating_capacity: null,
  is_chain_business: false,
  location_coordinates: null,
  city: null,
  state: null,
  country: null,
  pincode: null,
  social_media: {},
  logo_url: null,
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
  receipt_footer: null,
  receipt_header: null,
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
  }
};

const SettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const { settings: franchiseSettings, updateSettings } = useFranchise();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<Settings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
  }, [profile?.franchise_id]);

  useEffect(() => {
    if (originalSettings) {
      const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
      setHasChanges(changed);
    }
  }, [settings, originalSettings]);

  useEffect(() => {
    if (franchiseSettings) {
      const { created_at, updated_at, ...rest } = franchiseSettings;
      const newSettings: Settings = {
        ...defaultSettings,
        ...rest,
        business_hours: {
          ...defaultBusinessHours,
          ...(rest.business_hours || {})
        },
        printer_config: {
          ...defaultSettings.printer_config,
          ...(rest.printer_config || {})
        }
      };
      setSettings(newSettings);
      setOriginalSettings(newSettings);
      setLoading(false);
    }
  }, [franchiseSettings]);

  const loadSettings = async () => {
    if (!profile?.franchise_id) {
      toast.error('No franchise ID available');
      return;
    }

    try {
      // Handled by FranchiseContext
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const validateSettings = () => {
    const newErrors: Record<string, string> = {};

    if (!settings.business_name?.trim()) {
      newErrors.business_name = 'Restaurant name is required';
    }

    if (settings.phone && settings.phone.trim()) {
      if (!/^\+?[\d\s-]{10,}$/.test(settings.phone.trim())) {
        newErrors.phone = 'Invalid phone number';
      }
    }

    const taxRate = parseFloat(settings.tax_rate);
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      newErrors.tax_rate = 'Tax rate must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleBusinessHoursChange = (day: string, type: 'open' | 'close', value: string) => {
    const newHours = { ...settings.business_hours };
    if (!newHours[day]) {
      newHours[day] = { open: '09:00', close: '22:00' };
    }
    newHours[day][type] = value;
    handleChange('business_hours', newHours);
  };

  const saveSettings = async () => {
    if (!validateSettings()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setSaving(true);
    try {
      await updateSettings(settings);
      setOriginalSettings(settings);
      setHasChanges(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure your restaurant's settings and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <SettingsSection
          title="Basic Information"
          description="Your restaurant's main business information"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={settings.business_name || ''}
                onChange={(e) => handleChange('business_name', e.target.value)}
                className={`w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-offset-2 ${
                  errors.business_name
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.business_name && (
                <p className="mt-1 text-sm text-red-500">{errors.business_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
              <input
                type="url"
                value={settings.website || ''}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://yourrestaurant.com"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Contact & Location */}
        <SettingsSection
          title="Contact & Location"
          description="Your restaurant's address and contact information"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                value={settings.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+91 1234567890"
                className={`w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-offset-2 ${
                  errors.phone 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea
                value={settings.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={3}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                value={settings.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <input
                type="text"
                value={settings.state || ''}
                onChange={(e) => handleChange('state', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Business Type & Hours */}
        <SettingsSection
          title="Business Type & Hours"
          description="Set your restaurant type and operating hours"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant Type
              </label>
              <select
                value={settings.business_type || ''}
                onChange={(e) => handleChange('business_type', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <option value="">Select Type</option>
                <option value="restaurant">Restaurant</option>
                <option value="cafe">Café</option>
                <option value="fastfood">Fast Food</option>
                <option value="cloud_kitchen">Cloud Kitchen</option>
                <option value="food_court">Food Court</option>
                <option value="fine_dining">Fine Dining</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seating Capacity
              </label>
              <input
                type="number"
                value={settings.seating_capacity || ''}
                onChange={(e) => handleChange('seating_capacity', parseInt(e.target.value))}
                placeholder="Number of seats"
                min="0"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.is_chain_business}
                onChange={(e) => handleChange('is_chain_business', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">This is part of a restaurant chain</span>
            </label>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Business Hours</h3>
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
              <div key={day} className="flex items-center space-x-4">
                <span className="w-32 capitalize">{day}</span>
                <div className="flex gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Open</label>
                    <input
                      type="time"
                      value={settings.business_hours[day]?.open || '09:00'}
                      onChange={(e) => handleBusinessHoursChange(day, 'open', e.target.value)}
                      className="rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Close</label>
                    <input
                      type="time"
                      value={settings.business_hours[day]?.close || '22:00'}
                      onChange={(e) => handleBusinessHoursChange(day, 'close', e.target.value)}
                      className="rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SettingsSection>

        {/* Financial Settings */}
        <SettingsSection
          title="Financial Settings"
          description="Configure tax rates and payment options"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Rate (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={parseFloat(settings.tax_rate) || 0}
                onChange={(e) => handleChange('tax_rate', e.target.value.toString())}
                className={`w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-offset-2 ${
                  errors.tax_rate 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                step="0.01"
                min="0"
                max="100"
              />
              {errors.tax_rate && (
                <p className="mt-1 text-sm text-red-500">{errors.tax_rate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency Format
              </label>
              <select
                value={settings.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <option value="INR">Indian Rupee (₹)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Number
              </label>
              <input
                type="text"
                value={settings.gst_number || ''}
                onChange={(e) => handleChange('gst_number', e.target.value)}
                placeholder="Enter GST Number"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Branding & Theme */}
        <SettingsSection
          title="Branding & Theme"
          description="Customize your restaurant's appearance"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={settings.theme.primaryColor}
                  onChange={(e) => handleChange('theme', { 
                    ...settings.theme, 
                    primaryColor: e.target.value 
                  })}
                  className="h-10 w-20 rounded border-gray-300"
                />
                <span className="text-sm text-gray-500">{settings.theme.primaryColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Color
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={settings.theme.secondaryColor}
                  onChange={(e) => handleChange('theme', { 
                    ...settings.theme, 
                    secondaryColor: e.target.value 
                  })}
                  className="h-10 w-20 rounded border-gray-300"
                />
                <span className="text-sm text-gray-500">{settings.theme.secondaryColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo URL
              </label>
              <input
                type="url"
                value={settings.logo_url || ''}
                onChange={(e) => handleChange('logo_url', e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Receipt Settings */}
        <SettingsSection
          title="Receipt & Printing"
          description="Configure receipt template and printer settings"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Receipt Header
              </label>
              <textarea
                value={settings.receipt_header || ''}
                onChange={(e) => handleChange('receipt_header', e.target.value)}
                rows={3}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                placeholder="Enter receipt header text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Receipt Footer
              </label>
              <textarea
                value={settings.receipt_footer || ''}
                onChange={(e) => handleChange('receipt_footer', e.target.value)}
                rows={3}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                placeholder="Enter receipt footer text"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Receipt Options</h3>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.receipt_template.show_logo}
                  onChange={(e) => handleChange('receipt_template', {
                    ...settings.receipt_template,
                    show_logo: e.target.checked
                  })}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show Logo on Receipt</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.receipt_template.show_gst}
                  onChange={(e) => handleChange('receipt_template', {
                    ...settings.receipt_template,
                    show_gst: e.target.checked
                  })}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show GST Details</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.receipt_template.show_tax_breakdown}
                  onChange={(e) => handleChange('receipt_template', {
                    ...settings.receipt_template,
                    show_tax_breakdown: e.target.checked
                  })}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show Tax Breakdown</span>
              </label>
            </div>
          </div>
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection
          title="Notifications"
          description="Configure notification preferences"
        >
          <div className="space-y-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.notification_settings.order_alerts}
                onChange={(e) => handleChange('notification_settings', {
                  ...settings.notification_settings,
                  order_alerts: e.target.checked
                })}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">New Order Alerts</span>
                <p className="text-xs text-gray-500">Get notified about new orders</p>
              </div>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.notification_settings.low_inventory_alerts}
                onChange={(e) => handleChange('notification_settings', {
                  ...settings.notification_settings,
                  low_inventory_alerts: e.target.checked
                })}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Low Inventory Alerts</span>
                <p className="text-xs text-gray-500">Get notified when items are running low</p>
              </div>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.notification_settings.daily_reports}
                onChange={(e) => handleChange('notification_settings', {
                  ...settings.notification_settings,
                  daily_reports: e.target.checked
                })}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Daily Reports</span>
                <p className="text-xs text-gray-500">Receive daily sales and analytics reports</p>
              </div>
            </label>
          </div>
        </SettingsSection>

        {/* Save Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
          <div className="container mx-auto px-4 flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving || !hasChanges}
              className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                hasChanges && !saving
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
