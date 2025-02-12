import { createContext, useContext, useState, useEffect, ReactNode  } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export interface FranchiseSettings {
  tax_rate: number;
}

interface Franchise {
  id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
}

interface FranchiseContextType {
  franchise: Franchise | null;
  loading: boolean;
  error: string | null;
  settings: FranchiseSettings | null;
}

const FranchiseContext = createContext<FranchiseContextType | undefined>(undefined);

export function FranchiseProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFranchise = async () => {
      try {
        setError(null);
        setLoading(true);

        // If no profile or franchise_id, clear franchise
        if (!profile?.franchise_id) {
          setFranchise(null);
          return;
        }

        console.log('Fetching franchise:', profile.franchise_id); // Debug log

        const { data, error: fetchError } = await supabase
          .from('franchises')
          .select('*')
          .eq('id', profile.franchise_id)
          .single();

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        console.log('Franchise data:', data); // Debug log
        setFranchise(data);
      } catch (err) {
        console.error('Error fetching franchise:', err); // Debug log
        setError(err instanceof Error ? err.message : 'Failed to fetch franchise');
        setFranchise(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFranchise();
  }, [profile?.franchise_id]);

  // Subscribe to franchise changes
  useEffect(() => {
    if (!profile?.franchise_id) return;

    const subscription = supabase
      .channel('franchise_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'franchises',
        filter: `id=eq.${profile.franchise_id}`
      }, payload => {
        console.log('Franchise update:', payload); // Debug log
        if (payload.new) {
          setFranchise(payload.new as Franchise);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.franchise_id]);

  const value = {
    franchise,
    loading,
    error,
    settings: null
  };

  return (
    <FranchiseContext.Provider value={value}>
      {children}
    </FranchiseContext.Provider>
  );
}

export function useFranchise() {
  const context = useContext(FranchiseContext);
  if (!context) {
    throw new Error('useFranchiseContext must be used within a FranchiseProvider');
  }
  return context;
}
