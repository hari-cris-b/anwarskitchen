import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { 
  supabase, 
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

class ProfileManager {
  private static cache = new Map<string, { data: AuthUser; timestamp: number }>();
  private static readonly storageKey = 'pos_profile_cache';

  static initialize(): void {
    try {
      const cached = localStorage.getItem(this.storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        Object.entries(parsed).forEach(([key, value]) => {
          this.cache.set(key, value as { data: AuthUser; timestamp: number });
        });
      }
    } catch (err) {
      console.warn('Failed to load cached profiles:', err);
      this.clear();
    }
  }

  static get(userId: string): AuthUser | null {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(userId);
    return null;
  }

  static set(userId: string, profile: AuthUser): void {
    this.cache.set(userId, { data: profile, timestamp: Date.now() });
    this.persist();
  }

  static clear(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
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

ProfileManager.initialize();

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

  const isLoginPage = location.pathname === '/login';

  const loadUserProfile = useCallback(async (userId: string, mode?: LoginMode) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      console.log('Loading user profile:', { userId, mode });

      let currentProfile = ProfileManager.get(userId);
      if (currentProfile) {
        console.log('Using cached profile:', currentProfile);
        setProfile(currentProfile);
        setError(null);
        return;
      }

      const fetchProfile = async (): Promise<DatabaseStaff> => {
        console.log('Attempting to load profile for user:', userId);

        // Try super admin first
        try {
          const { data: superAdmin, error: superAdminError } = await supabase
            .from('super_admin')
            .select('*')
            .eq('auth_id', userId)
            .maybeSingle();

          if (superAdmin) {
            console.log('Found existing super admin profile');
            const permissions = ROLE_PERMISSIONS.super_admin;
            const now = new Date().toISOString();

            return {
              id: superAdmin.id,
              auth_id: superAdmin.auth_id,
              franchise_id: null,
              full_name: superAdmin.full_name,
              email: superAdmin.email,
              email_verified: true,
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
              created_at: now,
              updated_at: now
            };
          }

          // If super admin not found and user is trying to login as super admin
          if (mode === 'super_admin' || loginModeRef.current === 'super_admin') {
            console.log('Creating/linking super admin account');
            
            const { data: userData, error: userError } = await supabase.auth.getUser(userId);
            if (userError) throw new Error('Failed to get user details');

            const userEmail = userData.user.email;
            if (!userEmail) throw new Error('User email not found');

            // Create and link super admin account
            const { data: newSuperAdmin, error: createError } = await supabase.rpc('ensure_and_link_super_admin', {
              p_email: userEmail,
              p_auth_id: userId,
              p_full_name: userData.user.user_metadata?.full_name || 'Super Admin'
            });

            if (createError) throw createError;
            if (!newSuperAdmin) throw new Error('Failed to create super admin account');

            // Return the newly created super admin profile
            const now = new Date().toISOString();
            return {
              id: newSuperAdmin.id,
              auth_id: newSuperAdmin.auth_id,
              franchise_id: null,
              full_name: newSuperAdmin.full_name,
              email: newSuperAdmin.email,
              email_verified: true,
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
              permissions: ROLE_PERMISSIONS.super_admin,
              created_at: now,
              updated_at: now
            };
          }
        } catch (error) {
          console.error('Error handling super admin profile:', error);
          if (mode === 'super_admin') throw error;
        }

        // If not super admin or super admin failed, try staff
        console.log('Checking staff profile');
        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('auth_id', userId)
          .single();

        if (staffError || !staff) {
          console.error('No staff profile found:', staffError);
          throw new Error('User profile not found');
        }

        console.log('Found staff profile:', staff);
        return {
          ...staff,
          permissions: staff.permissions || ROLE_PERMISSIONS[staff.staff_type as StaffRole]
        } as DatabaseStaff;
      };

      const userData = await withRetry(fetchProfile, {
        maxRetries: MAX_PROFILE_RETRIES,
        timeoutMs: PROFILE_LOAD_TIMEOUT,
        isAuth: true
      });

      ProfileManager.set(userId, userData);
      setProfile(userData);
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
        // Initial session is handled separately in initializeAuth
        return;
      
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
      case 'USER_UPDATED':
        // Handle events that might need profile loading
        if (newSession?.user?.id) {
          await loadUserProfile(newSession.user.id, loginModeRef.current);
        }
        setLoading(false);
        break;
    }
  }, [loadUserProfile]);

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
        
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (initialSession?.user?.id) {
          console.log('Found initial session:', initialSession.user.id);
          setSession(initialSession);
          
          // Keep loading true until profile is loaded
          const profilePromise = loadUserProfile(initialSession.user.id, loginModeRef.current);
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
          if (!subscription) {
            throw new Error('Failed to create auth subscription');
          }
          authSubscription = { data: { subscription } };
          
          // Wait for profile to load before setting loading to false
          await profilePromise;
        } else {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
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
  }, [handleAuthStateChange, loadUserProfile, isLoginPage]);

  const signIn = async (email: string, password: string, mode: LoginMode = 'staff') => {
    try {
      setError(null);
      loginModeRef.current = mode;
      console.log('Signing in:', { email, mode });

      const { data, error } = await withRetry(
        async () => supabase.auth.signInWithPassword({ email, password }),
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
      
      const { error } = await withRetry(
        async () => supabase.auth.signOut(),
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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
