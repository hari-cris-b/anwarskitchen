import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { franchiseService } from '../services/franchiseService';
import { Franchise, FranchiseSettings } from '../types/franchise';

interface FranchiseContextType {
  franchise: (Franchise & { settings: FranchiseSettings }) | null;
  loading: boolean;
  error: string | null;
  updateFranchiseSettings: (
    franchiseId: string, 
    settings: Partial<FranchiseSettings>
  ) => Promise<void>;
}

export const FranchiseContext = createContext<FranchiseContextType>({
  franchise: null,
  loading: true,
  error: null,
  updateFranchiseSettings: async () => {}
});

export function FranchiseProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [franchise, setFranchise] = useState<(Franchise & { settings: FranchiseSettings }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      setFranchise(null);
      setLoading(false);
      return;
    }

    const loadFranchise = async () => {
      if (!profile.franchise_id) {
        setFranchise(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await franchiseService.getFranchise(profile.franchise_id);
        setFranchise(data as Franchise & { settings: FranchiseSettings });
      } catch (err) {
        console.error('Error loading franchise:', err);
        setError('Failed to load franchise data');
      } finally {
        setLoading(false);
      }
    };

    void loadFranchise();
  }, [profile]);

  const updateFranchiseSettings = async (
    franchiseId: string,
    settings: Partial<FranchiseSettings>
  ) => {
    if (!franchise) return;

    try {
      setError(null);
      const updatedFranchise = await franchiseService.updateFranchise({
        id: franchiseId,
        settings
      });
      setFranchise(updatedFranchise as Franchise & { settings: FranchiseSettings });
    } catch (err) {
      console.error('Error updating settings:', err);
      throw new Error('Failed to update franchise settings');
    }
  };

  return (
    <FranchiseContext.Provider 
      value={{ 
        franchise, 
        loading, 
        error, 
        updateFranchiseSettings 
      }}
    >
      {children}
    </FranchiseContext.Provider>
  );
}

export const useFranchise = () => {
  const context = useContext(FranchiseContext);
  if (!context) {
    throw new Error('useFranchise must be used within a FranchiseProvider');
  }
  return context;
};
