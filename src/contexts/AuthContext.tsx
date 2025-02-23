/* eslint-disable max-lines */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import { useNavigate, useLocation } from 'react-router-dom';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { 
  supabase,
  supabaseAdmin,
  withRetry, 
  isResourceConstraintError, 
  isNetworkError,
  REQUEST_CONFIG,
  SupabaseError
} from '../lib/supabase';
import { Staff, StaffRole, type DatabaseStaff, ROLE_PERMISSIONS, StaffPermissions } from '../types/staff';

export type LoginMode = 'staff' | 'super_admin';
export type AuthUser = Staff;

export interface AuthContextType {
  session: Session | null;
  profile: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string, mode?: LoginMode) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => {},
  updatePassword: async () => {}
});

const PROFILE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const AUTH_RETRY_COUNT = 3;
const PROFILE_LOAD_TIMEOUT = REQUEST_CONFIG.AUTH_TIMEOUT;
const MAX_PROFILE_RETRIES = 2;

interface CacheEntry {
  data: AuthUser;
  mode: LoginMode;
  timestamp: number;
}

class ProfileManager {
  private static cache = new Map<string, CacheEntry>();
  private static readonly storageKey = 'pos_profile_cache';
  private static readonly modeKey = 'pos_login_mode';

  static initialize(setMode: (mode: LoginMode) => void): void {
    try {
      const cached = localStorage.getItem(this.storageKey);
      const mode = localStorage.getItem(this.modeKey) as LoginMode;
      
      if (cached) {
        const parsed = JSON.parse(cached);
        Object.entries(parsed).forEach(([key, value]) => {
          const entry = value as CacheEntry;
          this.cache.set(key, entry);
          
          if (entry.mode === 'super_admin') {
            setMode('super_admin');
            return;
          }
        });
      }
      
      if (mode === 'staff' || mode === 'super_admin') {
        setMode(mode);
      }
    } catch (err) {
      console.warn('Failed to load cached profiles:', err);
      this.clear();
    }
  }

  static get(userId: string): { profile: AuthUser | null; mode: LoginMode | null } {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
      return { profile: cached.data, mode: cached.mode };
    }
    this.cache.delete(userId);
    return { profile: null, mode: null };
  }

  static set(userId: string, profile: AuthUser, mode: LoginMode): void {
    this.cache.set(userId, { data: profile, mode, timestamp: Date.now() });
    localStorage.setItem(this.modeKey, mode);
    this.persist();
  }

  static clear(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
      localStorage.removeItem(this.modeKey);
    }
    this.persist();
  }

  private static persist(): void {
    try {
      const data = Object.fromEntries(this.cache.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to persist profile cache:', err);
    }
  }
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const loadingRef = useRef(false);
  const loginModeRef = useRef<LoginMode>('staff');

  const setLoginMode = useCallback((mode: LoginMode) => {
    loginModeRef.current = mode;
  }, []);

  useEffect(() => {
    ProfileManager.initialize(setLoginMode);
  }, [setLoginMode]);

  const isLoginPage = location.pathname === '/login';

  const fetchProfile = async (userId: string): Promise<DatabaseStaff> => {
    // Use the new user_profiles view with our secure function
    const client = loginModeRef.current === 'super_admin' ? supabaseAdmin : supabase;
    const { data: profile, error: profileError } = await client
      .rpc('get_user_profile', { p_auth_id: userId });

    if (profileError || !profile) {
      console.error('No user profile found:', profileError);
      throw new Error('User profile not found');
    }

    console.log('Found user profile:', profile);

    // Convert view data to DatabaseStaff type
    if (profile.role_type === 'super_admin') {
      const permissions = ROLE_PERMISSIONS.super_admin;
      return {
        id: profile.profile_id,
        auth_id: profile.auth_id,
        franchise_id: null,
        full_name: profile.full_name,
        email: profile.email,
        email_verified: profile.email_verified,
        staff_type: 'super_admin' as StaffRole,
        status: 'active',
        pin_code: null,
        shift: null,
        hourly_rate: null,
        joining_date: null,
        phone: null,
        can_manage_staff: true,
        can_void_orders: true,
        can_modify_menu: true,
        permissions,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      };
    }

    // Regular staff profile
    return {
      ...profile,
      id: profile.profile_id,
      staff_type: profile.role_type as StaffRole,
      permissions: profile.permissions || ROLE_PERMISSIONS[profile.role_type as StaffRole]
    } as DatabaseStaff;
  };

  const loadUserProfile = useCallback(async (userId: string, mode?: LoginMode) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      console.log('Loading user profile:', { userId, mode });

      // Always clear cache when mode is super_admin to force a fresh load
      if (mode === 'super_admin') {
        ProfileManager.clear(userId);
      } else {
        const { profile: cachedProfile, mode: cachedMode } = ProfileManager.get(userId);
        if (cachedProfile) {
          if (cachedProfile.staff_type === 'super_admin') {
            console.log('Using cached super admin profile');
            setProfile(cachedProfile);
            loginModeRef.current = 'super_admin';
            setError(null);
            return;
          }
          
          if (mode === cachedMode) {
            console.log('Using cached staff profile');
            setProfile(cachedProfile);
            loginModeRef.current = cachedMode;
            setError(null);
            return;
          }
        }
      }

      // Force clear cache before fetching new profile
      ProfileManager.clear(userId);

      const userData = await withRetry(() => fetchProfile(userId), {
        maxRetries: MAX_PROFILE_RETRIES,
        timeoutMs: PROFILE_LOAD_TIMEOUT,
        isAuth: true
      });

      console.log('Fetched user profile:', userData);

      const effectiveMode = mode || loginModeRef.current;
      const finalMode = userData.staff_type === 'super_admin' ? 'super_admin' : effectiveMode;
      
      // Ensure permissions are set correctly
      if (userData.staff_type === 'super_admin') {
        userData.permissions = ROLE_PERMISSIONS.super_admin;
      } else {
        userData.permissions = userData.permissions || ROLE_PERMISSIONS[userData.staff_type];
      }

      ProfileManager.set(userId, userData, finalMode);
      setProfile(userData);
      loginModeRef.current = finalMode;
      setError(null);

    } catch (err) {
      console.error('Error loading user profile:', err);
      
      if (isResourceConstraintError(err)) {
        setError('Server is busy. Please try again in a moment.');
      } else if (isNetworkError(err)) {
        setError('Network error - please check your connection');
      } else {
        setError('Failed to load user profile');
        setProfile(null);
        ProfileManager.clear(userId);
        if (!isLoginPage) {
          navigate('/login');
        }
      }
    } finally {
      loadingRef.current = false;
    }
  }, [navigate, isLoginPage]);

  const handleAuthStateChange = useCallback(async (event: AuthChangeEvent, newSession: Session | null) => {
    console.log('Auth state changed:', { event, sessionExists: !!newSession });
    setSession(newSession);

    switch (event) {
      case 'SIGNED_OUT':
        setProfile(null);
        ProfileManager.clear();
        setLoading(false);
        return;
      
      case 'INITIAL_SESSION':
        return;
      
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
      case 'USER_UPDATED':
        if (newSession?.user?.id) {
          const currentProfile = profile;
          const effectiveMode = currentProfile?.staff_type === 'super_admin'
            ? 'super_admin'
            : loginModeRef.current;
            
          await loadUserProfile(newSession.user.id, effectiveMode);
        }
        setLoading(false);
        break;
    }
  }, [loadUserProfile, profile]);

  useEffect(() => {
    let mounted = true;
    let authSubscription: { data: { subscription: { unsubscribe: () => void } }; } | undefined;

    const cleanup = () => {
      mounted = false;
      if (authSubscription?.data?.subscription?.unsubscribe) {
        authSubscription.data.subscription.unsubscribe();
      }
    };

    async function initializeAuth() {
      try {
        setLoading(true);
        console.log('Initializing auth...');
        
        const client = loginModeRef.current === 'super_admin' ? supabaseAdmin : supabase;
        const { data: { session: initialSession } } = await client.auth.getSession();
        if (!mounted) return;

        if (initialSession?.user?.id) {
          console.log('Found initial session:', initialSession.user.id);
          setSession(initialSession);
          
          const { profile: cachedProfile } = ProfileManager.get(initialSession.user.id);
          const effectiveMode = cachedProfile?.staff_type === 'super_admin'
            ? 'super_admin'
            : loginModeRef.current;
            
          const profilePromise = loadUserProfile(initialSession.user.id, effectiveMode);
          
          const client = loginModeRef.current === 'super_admin' ? supabaseAdmin : supabase;
          const { data: { subscription } } = client.auth.onAuthStateChange(handleAuthStateChange);
          if (!subscription) {
            throw new Error('Failed to create auth subscription');
          }
          authSubscription = { data: { subscription } };
          
          await profilePromise;
        } else {
          const client = loginModeRef.current === 'super_admin' ? supabaseAdmin : supabase;
          const { data: { subscription } } = client.auth.onAuthStateChange(handleAuthStateChange);
          if (!subscription) {
            throw new Error('Failed to create auth subscription');
          }
          authSubscription = { data: { subscription } };
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Authentication failed');
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void initializeAuth();
    return cleanup;
  }, [handleAuthStateChange, loadUserProfile]);

  const signIn = async (email: string, password: string, mode: LoginMode = 'staff') => {
    try {
      setError(null);
      loginModeRef.current = mode;
      console.log('Signing in:', { email, mode });

      const client = mode === 'super_admin' ? supabaseAdmin : supabase;
      console.log('[Auth] Using client:', {
        type: mode === 'super_admin' ? 'admin' : 'regular',
        mode,
        timestamp: new Date().toISOString()
      });

      console.log('[Auth] Attempting sign in with:', { 
        email, 
        mode,
        client: mode === 'super_admin' ? 'admin' : 'regular',
        timestamp: new Date().toISOString()
      });

      const start = Date.now();
      const { data, error } = await withRetry(
        async () => {
          try {
            const resp = await client.auth.signInWithPassword({ email, password });
            const duration = Date.now() - start;
            
            if (resp.error) {
              console.error('[Auth] Sign in failed:', {
                status: resp.error.status,
                message: resp.error.message,
                mode,
                duration,
                timestamp: new Date().toISOString()
              });
            } else {
              console.log('[Auth] Sign in successful:', {
                userId: resp.data.user?.id,
                mode,
                duration,
                timestamp: new Date().toISOString()
              });
            }
            return resp;
          } catch (err) {
            const duration = Date.now() - start;
            console.error('[Auth] Sign in error:', {
              error: err,
              mode,
              duration,
              timestamp: new Date().toISOString()
            });
            throw err;
          }
        },
        {
          maxRetries: AUTH_RETRY_COUNT,
          timeoutMs: PROFILE_LOAD_TIMEOUT,
          isAuth: true
        }
      );

      if (error) throw error;
      if (!data.user) throw new Error('No user data received');
      
      console.log('Sign in successful:', data.user.id);
      await loadUserProfile(data.user.id, mode);
      
    } catch (err) {
      console.error('Error signing in:', err);
      
      let errorMessage = 'Failed to sign in';
      if (isResourceConstraintError(err)) {
        errorMessage = 'Server is busy. Please try again in a moment.';
      } else if (isNetworkError(err)) {
        errorMessage = 'Network error - please check your connection';
      } else if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (err.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before signing in';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      console.log('Signing out...');
      
      // Clear all auth states
      localStorage.removeItem('pos_auth');
      localStorage.removeItem('pos_admin_auth');
      localStorage.removeItem('pos_login_mode');
      ProfileManager.clear();

      const client = loginModeRef.current === 'super_admin' ? supabaseAdmin : supabase;
      const { error } = await withRetry(
        async () => client.auth.signOut(),
        {
          maxRetries: 1,
          timeoutMs: PROFILE_LOAD_TIMEOUT,
          isAuth: true
        }
      );
      
      if (error) throw error;
      
      setProfile(null);
      setSession(null);
      ProfileManager.clear();
      loginModeRef.current = 'staff';
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign out');
      throw err;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      console.log('Signing up:', { email });
      
      const { error } = await withRetry(
        async () => supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        }),
        {
          maxRetries: AUTH_RETRY_COUNT,
          timeoutMs: PROFILE_LOAD_TIMEOUT,
          isAuth: true
        }
      );
      
      if (error) throw error;
    } catch (err) {
      console.error('Error signing up:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign up');
      throw err;
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      setError(null);
      console.log('Updating password...');
      
      const { error } = await withRetry(
        async () => supabase.auth.updateUser({ password: newPassword }),
        {
          maxRetries: AUTH_RETRY_COUNT,
          timeoutMs: PROFILE_LOAD_TIMEOUT,
          isAuth: true
        }
      );
      
      if (error) throw error;
    } catch (err) {
      console.error('Error updating password:', err);
      setError(err instanceof Error ? err.message : 'Failed to update password');
      throw err;
    }
  };

  const value = {
    session,
    profile,
    loading: loading && !isLoginPage,
    error,
    signIn,
    signOut,
    signUp,
    updatePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
