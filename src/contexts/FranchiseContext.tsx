import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { FranchiseSettings, DbFranchiseSettings } from '../types/franchise';
import { handleApiSingleResponse, handleApiArrayResponse } from '../utils/apiUtils';
import { DatabaseError, ValidationError } from '../types/errors';

interface FranchiseContextType {
  settings: DbFranchiseSettings | null;
  franchise: { id: string } | null;
  error: string | null;
  loading: boolean;
  updateSettings: (settings: Partial<FranchiseSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const CONSTANTS = {
  REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  LOAD_TIMEOUT: 60000, // Increased to 60 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 5000, // Increased to 5 seconds
  MAX_RETRY_DELAY: 30000, // Increased to 30 seconds
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  MIN_REFRESH_INTERVAL: 60000 // 1 minute
};

const FranchiseContext = createContext<FranchiseContextType>({
  settings: null,
  franchise: null,
  error: null,
  loading: true,
  updateSettings: async () => {},
  refreshSettings: async () => {}
});

export function FranchiseProvider({ children }: { children: React.ReactNode }) {
  const { profile, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<DbFranchiseSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [retryAttempt, setRetryAttempt] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getCachedSettings = (franchiseId: string) => {
    try {
      const cached = localStorage.getItem(`franchise_settings_${franchiseId}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CONSTANTS.CACHE_DURATION) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Error reading cached settings:', err);
    }
    return null;
  };

  const cacheSettings = (franchiseId: string, data: DbFranchiseSettings) => {
    localStorage.setItem(`franchise_settings_${franchiseId}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  };

  const loadFranchiseSettings = useCallback(async () => {
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // Skip loading if we're still authenticating or no profile
      if (authLoading || !profile) {
        console.debug('Skipping settings load - auth in progress or no profile');
        setSettings(null);
        setLoading(false);
        return;
      }

      // Debug logging for initial state
      console.debug('Loading franchise settings:', {
        profileLoaded: !!profile,
        franchiseId: profile?.franchise_id,
        retryAttempt,
        authLoading
      });

      // Handle super admin case and regular users without franchise
      if (!profile?.franchise_id) {
        if (profile?.staff_type === 'super_admin') {
          console.debug('Super admin user - no franchise ID required');
          setSettings(null);
          setError(null);
          setLoading(false);
          return;
        } else {
          console.debug('No franchise ID available, skipping settings load');
          setError('No franchise assigned to your account');
          setSettings(null);
          setLoading(false);
          return;
        }
      }

      // Try loading from cache first
      const cached = getCachedSettings(profile.franchise_id);
      if (cached) {
        setSettings(cached);
        setError(null);
        setLoading(false);
      }

      setLoading(true);
      setError(null);

      // Clean up previous controller if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          reject(new Error('Settings load timeout'));
        }, CONSTANTS.LOAD_TIMEOUT);
      });

      try {
        console.debug('Starting settings query for franchise:', profile.franchise_id);

        const settingsData = await Promise.race([
          handleApiArrayResponse<DbFranchiseSettings>(
            supabase
              .from('franchise_settings')
              .select(`
                id,
                franchise_id, 
                business_name, 
                tax_rate, 
                currency, 
                business_hours,
                theme,
                phone,
                email,
                address,
                gst_number,
                created_at,
                updated_at,
                subscription_status
              `)
              .eq('franchise_id', profile.franchise_id)
              .limit(1),
            'fetching franchise settings'
          ),
          timeoutPromise
        ]);

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (!settingsData || settingsData.length === 0) {
          console.debug('No settings found for franchise:', profile.franchise_id);
          throw new Error('No settings found for this franchise');
        }

        console.debug('Settings loaded successfully');
        setSettings(settingsData[0]);
        cacheSettings(profile.franchise_id, settingsData[0]);
        setError(null);
        setRetryAttempt(0);
      } catch (err) {
        console.debug('Query error:', err);
        throw err;
      }
    } catch (err) {
      console.error('Error loading franchise settings:', err);
      
      if (retryAttempt < CONSTANTS.MAX_RETRIES) {
        let retryDelay = Math.min(
          CONSTANTS.RETRY_DELAY_BASE * Math.pow(2, retryAttempt),
          CONSTANTS.MAX_RETRY_DELAY
        );

        // Add extra delay for permission errors
        if (err instanceof Error && err.message.includes('permission')) {
          retryDelay += 5000; // Add 5 seconds for permission establishment
        }

        console.debug(`Will retry in ${retryDelay}ms (attempt ${retryAttempt + 1}/${CONSTANTS.MAX_RETRIES})`);
        
        setRetryAttempt(prev => prev + 1);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return loadFranchiseSettings();
      }

      setSettings(null);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
      setLoading(false);
    }
  }, [profile, retryAttempt, authLoading]);

  const refreshSettings = useCallback(async (force = false) => {
    // Skip refresh for super admin or if no franchise ID
    if (!profile?.franchise_id) {
      if (profile?.staff_type === 'super_admin') {
        return; // Super admin doesn't need franchise settings
      }
      throw new ValidationError('No franchise assigned to your account');
    }
    
    if (!force && Date.now() - lastRefresh < CONSTANTS.MIN_REFRESH_INTERVAL) return;

    try {
      await loadFranchiseSettings();
      setLastRefresh(Date.now());
    } catch (err) {
      console.error('Error refreshing franchise settings:', err);
      throw err;
    }
  }, [profile?.franchise_id, lastRefresh, loadFranchiseSettings]);

  useEffect(() => {
    const mountedRef = { current: true };
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const cleanupFns: Array<() => void> = [];

    async function setupSubscription() {
      if (authLoading) {
        console.debug('Skipping subscription setup - still loading auth');
        setSettings(null);
        setLoading(false);
        return;
      }

      // Handle super admin case
      if (!profile?.franchise_id) {
        if (profile?.staff_type === 'super_admin') {
          console.debug('Super admin user - skipping franchise settings subscription');
          setSettings(null);
          setError(null);
          setLoading(false);
          return;
        } else {
          console.debug('Skipping subscription setup - no franchise_id');
          setSettings(null);
          setLoading(false);
          return;
        }
      }

      try {
        // Initial load
        await loadFranchiseSettings();

        if (!mountedRef.current) return;

        // Setup realtime
        const channelName = `franchise-settings-${profile.franchise_id}`;
        channel = supabase.channel(channelName, {
          config: {
            broadcast: {
              self: false
            },
            presence: {
              key: profile.franchise_id
            }
          }
        });
        await channel
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'franchise_settings',
              filter: `franchise_id=eq.${profile.franchise_id}`
            },
            async (payload) => {
              if (!mountedRef.current) return;
              
              try {
                // Use optimistic update if possible
                const newData = payload.new as DbFranchiseSettings;
                if (newData && settings) {
                  setSettings(prev => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      ...newData
                    };
                  });
                } else {
                  // Fall back to full refresh if needed
                  await loadFranchiseSettings();
                }
              } catch (err) {
                console.error('Error handling settings change:', err);
              }
            }
          )
          .subscribe();

        // Setup refresh interval
        const refreshTimer = setInterval(() => {
          if (mountedRef.current && profile?.franchise_id) {
            void loadFranchiseSettings();
          }
        }, CONSTANTS.REFRESH_INTERVAL);
        
        cleanupFns.push(() => clearInterval(refreshTimer));

      } catch (error) {
        console.error('Subscription setup error:', error);
        if (mountedRef.current) {
          setError('Failed to setup realtime updates');
          setLoading(false);
        }
        void loadFranchiseSettings(); // Retry on error
      }
    }

    void setupSubscription();

    return () => {
      mountedRef.current = false;
      if (channel) void channel.unsubscribe();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      cleanupFns.forEach(cleanup => cleanup());
    };
  }, [profile?.franchise_id, authLoading, loadFranchiseSettings]);

  const updateSettings = async (newSettings: Partial<FranchiseSettings>) => {
    if (!profile?.franchise_id) {
      if (profile?.staff_type === 'super_admin') {
        throw new ValidationError('Super admin cannot modify franchise settings directly - use franchise management tools instead');
      }
      throw new ValidationError('No franchise associated with your account');
    }

    try {
      await handleApiSingleResponse<DbFranchiseSettings>(
        supabase
          .from('franchise_settings')
          .upsert({
            ...newSettings,
            franchise_id: profile.franchise_id,
            updated_at: new Date().toISOString()
          })
          .select()
          .single(),
        'updating franchise settings'
      );

      await loadFranchiseSettings();
    } catch (err) {
      console.error('Error updating franchise settings:', err);
      throw err instanceof Error ? err : new DatabaseError('Failed to update settings');
    }
  };

  const value = {
    settings,
    franchise: profile?.franchise_id ? { id: profile.franchise_id } : null,
    error,
    loading,
    updateSettings,
    refreshSettings
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
    throw new Error('useFranchise must be used within a FranchiseProvider');
  }
  return context;
}
