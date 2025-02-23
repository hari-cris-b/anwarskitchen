import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import ErrorAlert from '../../components/ErrorAlert';
import { franchisorService } from '../../services/franchisorService';
import type { FranchiseCreateInput, FranchiseDetail } from '../../types/franchise';
import { supabase } from '../../lib/supabase';

const FranchiseForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [franchise, setFranchise] = React.useState<FranchiseDetail | null>(null);

  const [formData, setFormData] = React.useState<FranchiseCreateInput>({
    name: '',
    address: '',
    settings: {
      business_name: '',
      email: '',
      phone: '',
      subscription_status: 'active',
      tax_rate: 0,
      currency: 'INR',
      address: null,
      city: null,
      state: null,
      country: null,
      pincode: null,
      gst_number: null,
      receipt_header: '',
      receipt_footer: ''
    }
  });

  React.useEffect(() => {
    const loadFranchise = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const data = await franchisorService.getFranchiseDetails(id);
        setFranchise(data);
        setFormData({
          name: data.name,
          address: data.address,
          settings: data.settings
        });
      } catch (err) {
        setError('Failed to load franchise details');
        console.error('Error loading franchise:', err);
      } finally {
        setLoading(false);
      }
    };

    void loadFranchise();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (id) {
        // Update franchise settings
        const { data, error } = await supabase
          .from('franchises')
          .update({
            name: formData.name,
            address: formData.address,
          })
          .eq('id', id);

        if (error) throw error;

        // Update franchise settings
        const { error: settingsError } = await supabase
          .from('franchise_settings')
          .update(formData.settings)
          .eq('franchise_id', id);

        if (settingsError) throw settingsError;
      } else {
        // Create new franchise
        await franchisorService.createFranchise(formData);
      }
      navigate('/super-admin/franchises');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save franchise');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {id ? 'Edit Franchise' : 'New Franchise'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {id ? 'Update franchise details' : 'Create a new franchise location'}
          </p>
        </div>
      </div>

      {error && <ErrorAlert message={error} className="mb-6" />}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow-sm rounded-lg p-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Franchise Name
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            Address
          </label>
          <textarea
            name="address"
            id="address"
            required
            value={formData.address}
            onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Contact Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            required
            value={formData.settings.email}
            onChange={e => setFormData(prev => ({
              ...prev,
              settings: { ...prev.settings, email: e.target.value }
            }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Contact Phone
          </label>
          <input
            type="tel"
            name="phone"
            id="phone"
            required
            value={formData.settings.phone}
            onChange={e => setFormData(prev => ({
              ...prev,
              settings: { ...prev.settings, phone: e.target.value }
            }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="tax_rate" className="block text-sm font-medium text-gray-700">
            Tax Rate (%)
          </label>
          <input
            type="number"
            name="tax_rate"
            id="tax_rate"
            min="0"
            max="100"
            step="0.01"
            value={formData.settings.tax_rate || 0}
            onChange={e => setFormData(prev => ({
              ...prev,
              settings: { ...prev.settings, tax_rate: parseFloat(e.target.value) }
            }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.settings.subscription_status}
            onChange={e => setFormData(prev => ({
              ...prev,
              settings: { ...prev.settings, subscription_status: e.target.value as any }
            }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/super-admin/franchises')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
          >
            {saving ? 'Saving...' : (id ? 'Update Franchise' : 'Create Franchise')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FranchiseForm;
