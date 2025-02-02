import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { franchiseService } from '../services/franchiseService';
import type { FranchiseSettings } from '../types';

interface FranchiseContextType {
  settings: FranchiseSettings | null;
  loading: boolean;
  error: string | null;
}

const FranchiseContext = createContext<FranchiseContextType | undefined>(undefined);

export function FranchiseProvider({ children }: { children: React.ReactNode }) {
  const { profile, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<FranchiseSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let abortController = new AbortController();
    
    const loadFranchiseData = async () => {
      try {
        // Don't load franchise data if auth is still loading
        if (authLoading) {
          return;
        }

        if (!mounted) return;

        setLoading(true);
        setError(null);
        
        const franchiseId = profile?.franchise_id;
        
        // Don't try to load data if we don't have a franchise ID
        if (!franchiseId) {
          if (mounted) {
            setError('No franchise associated with your account');
            setLoading(false);
          }
          return;
        }

        const settingsData = await franchiseService.getFranchiseSettings(franchiseId);
        
        if (!mounted) return;
        
        setSettings(settingsData);
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        
        console.error('Error loading franchise data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load franchise settings');
        setSettings(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadFranchiseData();

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [profile?.franchise_id, authLoading]);

  const value = {
    settings,
    loading,
    error
  };

  return (
    <FranchiseContext.Provider value={value}>
      {children}
    </FranchiseContext.Provider>
  );
}

export function useFranchise() {
  const context = useContext(FranchiseContext);
  if (context === undefined) {
    throw new Error('useFranchise must be used within a FranchiseProvider');
  }
  return context;
}

export default FranchiseProvider;
