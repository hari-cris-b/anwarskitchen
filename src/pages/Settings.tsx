import { useState } from 'react';
import { useFranchise } from '../contexts/FranchiseContext';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import ErrorAlert from '../components/ErrorAlert';
import type {
  FranchiseSettings,
  BusinessHours,
  NotificationSettings,
  ReceiptTemplate
} from '../types/franchise';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DEFAULT_HOURS: Record<DayOfWeek, BusinessHours> = DAYS.reduce((acc, day) => ({
  ...acc,
  [day]: { open: '09:00', close: '22:00', is_closed: false }
}), {} as Record<DayOfWeek, BusinessHours>);

const DEFAULT_NOTIFICATION_SETTINGS: Required<NotificationSettings> = {
  order_alerts: true,
  low_stock_alerts: true,
  staff_notifications: true,
  email_notifications: false,
  sms_notifications: false
};

const DEFAULT_RECEIPT_TEMPLATE: Required<ReceiptTemplate> = {
  show_logo: true,
  show_tax_details: true,
  show_tax_breakdown: true,
  show_gst: true,
  show_order_id: true,
  custom_header: '',
  custom_footer: 'Thank you for your business!'
};

interface BusinessHoursFormProps {
  hours: Record<DayOfWeek, BusinessHours>;
  onChange: (newHours: Record<DayOfWeek, BusinessHours>) => void;
}

function BusinessHoursForm({ hours, onChange }: BusinessHoursFormProps) {
  const handleDayChange = (day: DayOfWeek, updates: Partial<BusinessHours>) => {
    onChange({
      ...hours,
      [day]: { ...hours[day], ...updates }
    });
  };

  return (
    <div className="space-y-4">
      {DAYS.map(day => (
        <div key={day} className="flex items-center space-x-4">
          <div className="w-24 capitalize">{day}</div>
          <input
            type="checkbox"
            checked={!hours[day].is_closed}
            onChange={e => handleDayChange(day, { is_closed: !e.target.checked })}
            className="h-4 w-4 text-indigo-600"
          />
          <div className="flex space-x-2">
            <input
              type="time"
              value={hours[day].open}
              onChange={e => handleDayChange(day, { open: e.target.value })}
              disabled={hours[day].is_closed}
              className="rounded border-gray-300 disabled:bg-gray-100"
            />
            <span>to</span>
            <input
              type="time"
              value={hours[day].close}
              onChange={e => handleDayChange(day, { close: e.target.value })}
              disabled={hours[day].is_closed}
              className="rounded border-gray-300 disabled:bg-gray-100"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

type SettingsFormData = Required<
  Pick<FranchiseSettings, 
    | 'business_name'
    | 'tax_rate'
    | 'currency'
    | 'business_hours'
    | 'phone'
    | 'email'
    | 'address'
    | 'gst_number'
    | 'notification_settings'
    | 'receipt_template'
  >
>;

export default function Settings() {
  const { franchise, updateFranchiseSettings } = useFranchise();
  const { profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const settings = franchise?.settings;

  const [formData, setFormData] = useState<SettingsFormData>({
    business_name: settings?.business_name || '',
    tax_rate: settings?.tax_rate || 5,
    currency: settings?.currency || 'INR',
    business_hours: settings?.business_hours || DEFAULT_HOURS,
    phone: settings?.phone || '',
    email: settings?.email || '',
    address: settings?.address || '',
    gst_number: settings?.gst_number || '',
    notification_settings: {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...settings?.notification_settings
    },
    receipt_template: {
      ...DEFAULT_RECEIPT_TEMPLATE,
      ...settings?.receipt_template
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!franchise?.id) return;

    try {
      setSaving(true);
      setError(null);

      await updateFranchiseSettings(franchise.id, formData);
    } catch (err) {
      setError('Failed to save settings');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!franchise || !settings) {
    return (
      <div className="text-center p-8 text-gray-500">
        No franchise settings available
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Franchise Settings</h1>

      {error && <ErrorAlert message={error} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Name</label>
              <input
                type="text"
                value={formData.business_name}
                onChange={e => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
              <input
                type="number"
                value={formData.tax_rate}
                onChange={e => setFormData(prev => ({ ...prev, tax_rate: Number(e.target.value) }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">GST Number</label>
              <input
                type="text"
                value={formData.gst_number || ''}
                onChange={e => setFormData(prev => ({ ...prev, gst_number: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </section>

        {/* Business Hours */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Business Hours</h2>
          <BusinessHoursForm
            hours={formData.business_hours}
            onChange={newHours => setFormData(prev => ({ ...prev, business_hours: newHours }))}
          />
        </section>

        {/* Contact Information */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                value={formData.address || ''}
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </section>

        {/* Notification Settings */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
          <div className="space-y-4">
            {(Object.keys(formData.notification_settings) as Array<keyof NotificationSettings>).map(key => (
              <div key={key} className="flex items-center">
                <input
                  type="checkbox"
                  id={key}
                  checked={formData.notification_settings[key]}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    notification_settings: {
                      ...prev.notification_settings,
                      [key]: e.target.checked
                    }
                  }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor={key} className="ml-3 block text-sm font-medium text-gray-700 capitalize">
                  {key.replace(/_/g, ' ')}
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* Receipt Settings */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Receipt Settings</h2>
          <div className="space-y-4">
            {(Object.entries(formData.receipt_template) as Array<[keyof ReceiptTemplate, boolean | string]>)
              .filter(([key]) => typeof formData.receipt_template[key] === 'boolean')
              .map(([key]) => (
                <div key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    id={key}
                    checked={formData.receipt_template[key] as boolean}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      receipt_template: {
                        ...prev.receipt_template,
                        [key]: e.target.checked
                      }
                    }))}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor={key} className="ml-3 block text-sm font-medium text-gray-700 capitalize">
                    {key.replace(/_/g, ' ')}
                  </label>
                </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700">Receipt Header</label>
              <input
                type="text"
                value={formData.receipt_template.custom_header}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  receipt_template: {
                    ...prev.receipt_template,
                    custom_header: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Receipt Footer</label>
              <input
                type="text"
                value={formData.receipt_template.custom_footer}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  receipt_template: {
                    ...prev.receipt_template,
                    custom_footer: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </section>

        <div className="pt-5">
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              loading={saving}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
