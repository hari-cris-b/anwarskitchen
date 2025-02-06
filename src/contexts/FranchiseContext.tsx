import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface FranchiseSettings {
  id: string;
  name: string;
  currency: string;
  tax_rate: number;
  address: string;
  phone: string;
  email: string;
}

interface FranchiseContextType {
  settings: FranchiseSettings | null;
  loading: boolean;
  error: string | null;
  formatCurrency: (amount: number) => string;
}

const FranchiseContext = createContext<FranchiseContextType>({
  settings: null,
  loading: true,
  error: null,
  formatCurrency: (amount: number) => `₹${amount.toFixed(2)}`
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
        // Use get_user_profile to verify franchise access first
        const { data: profileData, error: profileError } = await supabase
          .rpc('get_user_profile', { user_id: profile.id });

        if (!isMounted) return;

        if (profileError) throw profileError;

        // If profile access is verified, get franchise settings
        const { data, error: fetchError } = await supabase
          .from('franchise_settings')
          .select('*')
          .eq('id', profile.franchise_id)
          .single();

        if (!isMounted) return;

        if (fetchError) {
          // If no settings exist, create default settings
          if (fetchError.code === 'PGRST116') {
            const { data: newSettings, error: createError } = await supabase
              .from('franchise_settings')
              .insert({
                id: profile.franchise_id,
                name: 'Default Franchise',
                currency: 'INR',
                tax_rate: 5.00
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

  const contextValue = React.useMemo(() => ({
    settings,
    loading,
    error,
    formatCurrency
  }), [settings, loading, error, formatCurrency]);

  return (
    <FranchiseContext.Provider value={contextValue}>
      {children}
    </FranchiseContext.Provider>
  );
}

export default FranchiseProvider;
