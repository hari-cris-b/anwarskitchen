// src/pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface Settings {
  id?: string;
  franchise_id: string;
  restaurant_name: string;
  address: string;
  phone: string;
  tax_rate: number;
  currency: string;
  print_format: 'thermal' | 'a4';
  auto_backup: boolean;
}

export default function SettingsPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<Settings>({
    franchise_id: profile?.franchise_id || '',
    restaurant_name: '',
    address: '',
    phone: '',
    tax_rate: 0,
    currency: 'INR',
    print_format: 'thermal',
    auto_backup: true
  });
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

  const loadSettings = async () => {
    if (!profile?.franchise_id) {
      toast.error('No franchise ID available');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('franchise_id', profile.franchise_id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, create default settings
          const defaultSettings: Settings = {
            franchise_id: profile.franchise_id,
            restaurant_name: '',
            address: '',
            phone: '',
            tax_rate: 0,
            currency: 'INR',
            print_format: 'thermal',
            auto_backup: true
          };

          const { error: insertError } = await supabase
            .from('settings')
            .insert([defaultSettings]);

          if (insertError) throw insertError;

          setSettings(defaultSettings);
          setOriginalSettings(defaultSettings);
          return;
        }
        throw error;
      }

      if (data) {
        setSettings(data);
        setOriginalSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const validateSettings = () => {
    const newErrors: Record<string, string> = {};

    if (!settings.restaurant_name.trim()) {
      newErrors.restaurant_name = 'Restaurant name is required';
    }

    if (!settings.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-]{10,}$/.test(settings.phone.trim())) {
      newErrors.phone = 'Invalid phone number';
    }

    if (settings.tax_rate < 0 || settings.tax_rate > 100) {
      newErrors.tax_rate = 'Tax rate must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const saveSettings = async () => {
    if (!validateSettings()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert([settings]);

      if (error) throw error;
      
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
      <div className="bg-white rounded-lg shadow-md p-6 relative mb-16">
        <div className="space-y-8">
          {/* Business Information */}
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Business Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Restaurant Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.restaurant_name}
                  onChange={(e) => handleChange('restaurant_name', e.target.value)}
                  className={`w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-offset-2 ${
                    errors.restaurant_name 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {errors.restaurant_name && (
                  <p className="mt-1 text-sm text-red-500">{errors.restaurant_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={`w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-offset-2 ${
                    errors.phone 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="+91 1234567890"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address
                </label>
                <textarea
                  value={settings.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter your complete business address"
                />
              </div>
            </div>
          </section>

          {/* Financial Settings */}
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Financial Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Rate (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={settings.tax_rate}
                  onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value))}
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
                  Currency
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
            </div>
          </section>

          {/* System Settings */}
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              System Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Print Format
                </label>
                <select
                  value={settings.print_format}
                  onChange={(e) => handleChange('print_format', e.target.value as 'thermal' | 'a4')}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <option value="thermal">Thermal Printer</option>
                  <option value="a4">A4 Paper</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.auto_backup}
                      onChange={(e) => handleChange('auto_backup', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 h-5 w-5"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 block">
                        Enable automatic daily backup
                      </span>
                      <span className="text-xs text-gray-500">
                        Your data will be automatically backed up every day at midnight
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Fixed bottom save button */}
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
}
