import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useFranchise } from '../contexts/FranchiseContext';
import { FranchiseSettings, BusinessHours, DaySchedule } from '../types/franchise';

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

const defaultBusinessHours: BusinessHours = {
  monday: { open: '09:00', close: '22:00' },
  tuesday: { open: '09:00', close: '22:00' },
  wednesday: { open: '09:00', close: '22:00' },
  thursday: { open: '09:00', close: '22:00' },
  friday: { open: '09:00', close: '22:00' },
  saturday: { open: '09:00', close: '22:00' },
  sunday: { open: '09:00', close: '22:00' }
};

type ExtendedFranchiseSettings = Omit<FranchiseSettings, 'id' | 'franchise_id' | 'created_at' | 'updated_at'> & {
  enable_kitchen_display: boolean;
  enable_customer_display: boolean;
};

const defaultSettings: Partial<ExtendedFranchiseSettings> = {
  business_name: '',
  tax_rate: '0.00',
  currency: 'INR',
  business_hours: defaultBusinessHours,
  receipt_footer: null,
  receipt_header: null,
  enable_kitchen_display: true,
  enable_customer_display: true,
  theme: {
    primaryColor: '#FFA500',
    secondaryColor: '#FFD700'
  },
  phone: null,
  email: null,
  address: null,
  gst_number: null
};

const SettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const { settings: franchiseSettings, updateSettings: updateFranchiseSettings } = useFranchise();
  const [settings, setSettings] = useState<Partial<ExtendedFranchiseSettings>>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<Partial<ExtendedFranchiseSettings> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (franchiseSettings) {
      const extendedSettings: Partial<ExtendedFranchiseSettings> = {
        ...defaultSettings,
        ...franchiseSettings,
        enable_kitchen_display: true,
        enable_customer_display: true
      };
      setSettings(extendedSettings);
      setOriginalSettings(extendedSettings);
      setLoading(false);
    }
  }, [franchiseSettings]);

  useEffect(() => {
    if (originalSettings) {
      const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
      setHasChanges(changed);
    }
  }, [settings, originalSettings]);

  const validateSettings = () => {
    const newErrors: Record<string, string> = {};

    if (!settings.business_name?.trim()) {
      newErrors.business_name = 'Business name is required';
    }

    const taxRate = parseFloat(String(settings.tax_rate));
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      newErrors.tax_rate = 'Tax rate must be between 0 and 100';
    }

    if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof ExtendedFranchiseSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleBusinessHoursChange = (day: keyof BusinessHours, type: keyof DaySchedule, value: string) => {
    const newHours = { ...settings.business_hours } as BusinessHours;
    if (!newHours[day]) {
      newHours[day] = { open: '09:00', close: '22:00' };
    }
    (newHours[day] as DaySchedule)[type] = value;
    handleChange('business_hours', newHours);
  };

  const saveSettings = async () => {
    if (!validateSettings()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setSaving(true);
    try {
      const { enable_kitchen_display, enable_customer_display, ...franchiseSettings } = settings;
      await updateFranchiseSettings(franchiseSettings);
      setOriginalSettings(settings);
      setHasChanges(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
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
        <p className="text-gray-600 mt-2">Configure your restaurant's settings and preferences</p>
      </div>

      <SettingsSection title="Business Information" description="Configure your business details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name <span className="text-red-500">*</span>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GST Number
            </label>
            <input
              type="text"
              value={settings.gst_number || ''}
              onChange={(e) => handleChange('gst_number', e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={settings.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={settings.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-offset-2 ${
                errors.email 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Address
            </label>
            <textarea
              value={settings.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={3}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Business Hours" description="Set your operating hours">
        <div className="space-y-4">
          {Object.keys(defaultBusinessHours).map((day) => (
            <div key={day} className="flex items-center space-x-4">
              <span className="w-32 capitalize">{day}</span>
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Open</label>
                  <input
                    type="time"
                    value={settings.business_hours?.[day as keyof BusinessHours]?.open || '09:00'}
                    onChange={(e) => handleBusinessHoursChange(day as keyof BusinessHours, 'open', e.target.value)}
                    className="rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Close</label>
                  <input
                    type="time"
                    value={settings.business_hours?.[day as keyof BusinessHours]?.close || '22:00'}
                    onChange={(e) => handleBusinessHoursChange(day as keyof BusinessHours, 'close', e.target.value)}
                    className="rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Theme Settings" description="Configure your theme colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={settings.theme?.primaryColor || '#FFA500'}
                onChange={(e) => handleChange('theme', { ...settings.theme, primaryColor: e.target.value })}
                className="h-10 w-20 rounded border-gray-300"
              />
              <input
                type="text"
                value={settings.theme?.primaryColor || '#FFA500'}
                onChange={(e) => handleChange('theme', { ...settings.theme, primaryColor: e.target.value })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Color
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={settings.theme?.secondaryColor || '#FFD700'}
                onChange={(e) => handleChange('theme', { ...settings.theme, secondaryColor: e.target.value })}
                className="h-10 w-20 rounded border-gray-300"
              />
              <input
                type="text"
                value={settings.theme?.secondaryColor || '#FFD700'}
                onChange={(e) => handleChange('theme', { ...settings.theme, secondaryColor: e.target.value })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Financial Settings" description="Configure tax rates">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Rate (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={settings.tax_rate || '0'}
              onChange={(e) => handleChange('tax_rate', e.target.value)}
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
              value={settings.currency || 'INR'}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <option value="INR">Indian Rupee (₹)</option>
              <option value="USD">US Dollar ($)</option>
              <option value="EUR">Euro (€)</option>
            </select>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Display Settings" description="Configure display preferences">
        <div className="space-y-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.enable_kitchen_display}
              onChange={(e) => handleChange('enable_kitchen_display', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Enable Kitchen Display</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.enable_customer_display}
              onChange={(e) => handleChange('enable_customer_display', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Enable Customer Display</span>
          </label>
        </div>
      </SettingsSection>

      <SettingsSection title="Receipt Settings" description="Configure receipt content">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </SettingsSection>

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
  );
};

export default SettingsPage;
