import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  email: string;
  franchise_id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  phone: string | null;
  is_active: boolean;
  joining_date: string | null;
  salary: number | null;
  shift: 'morning' | 'evening' | 'night' | null;
}

interface GetUserProfileResponse {
  id: string;
  email: string;
  franchise_id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  phone: string | null;
  is_active: boolean;
  joining_date: string | null;
  salary: number | null;
  shift: 'morning' | 'evening' | 'night' | null;
}

type AuthResponse = {
  user: User;
  session: Session;
  weakPassword?: {
    message: string;
  };
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  loading: boolean;
  session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a service role client for admin operations
const supabaseAdmin = supabase;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();

  const createProfile = useCallback(async (userId: string, userEmail: string): Promise<Profile | null> => {
    try {
      // Check if any admin exists using service role client
      const { data: adminCheck } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .single();

      const isFirstUser = !adminCheck;

      let franchiseId: string | null = null;

      if (isFirstUser) {
        // Create a new franchise for the first admin using service role client
        const { data: newFranchise, error: franchiseError } = await supabaseAdmin
          .from('franchises')
          .insert([
            {
              name: 'Default Franchise',
              address: 'Default Address'
            }
          ])
          .select()
          .single();

        if (franchiseError) {
          console.error('Error creating franchise:', franchiseError);
          return null;
        }

        franchiseId = newFranchise.id;
      } else {
        // For non-admin users, get the first available franchise
        const { data: franchise } = await supabaseAdmin
          .from('franchises')
          .select('id')
          .limit(1)
          .single();
        
        franchiseId = franchise?.id;
      }

      if (!franchiseId) {
        console.error('No franchise available');
        return null;
      }

      // Create new profile using service role client
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert([
          {
            id: userId,
            email: userEmail,
            full_name: userEmail.split('@')[0],
            role: isFirstUser ? 'admin' : 'staff',
            franchise_id: franchiseId
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return null;
      }

      return newProfile;
    } catch (error) {
      console.error('Error in createProfile:', error);
      return null;
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string, userEmail: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_profile', { user_id: userId })
        .returns<GetUserProfileResponse>();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      // RPC returns an array, get the first item
      const profile = Array.isArray(data) ? data[0] : null;

      if (!profile) {
        console.log('No profile found, creating one...');
        return await createProfile(userId, userEmail);
      }

      // Convert to Profile type
      const formattedProfile: Profile = {
        id: profile.id,
        email: profile.email,
        franchise_id: profile.franchise_id,
        role: profile.role as UserRole,
        full_name: profile.full_name,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        phone: profile.phone,
        is_active: profile.is_active,
        joining_date: profile.joining_date,
        salary: profile.salary,
        shift: profile.shift
      };

      // Handle case where profile exists but has no franchise_id
      if (!profile.franchise_id && profile.role === 'admin') {
        // Create a new franchise for the admin using service role client
        const { data: newFranchise, error: franchiseError } = await supabaseAdmin
          .from('franchises')
          .insert([
            {
              name: 'Default Franchise',
              address: 'Default Address'
            }
          ])
          .select()
          .single();

        if (franchiseError) {
          console.error('Error creating franchise:', franchiseError);
          return null;
        }

        // Update the profile with the new franchise_id using service role client
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ franchise_id: newFranchise.id })
          .eq('id', userId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating profile:', updateError);
          return null;
        }

        return updatedProfile;
      }

      return profile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  }, [createProfile]);

  const handleSessionUpdate = useCallback(async (newSession: Session | null) => {
    try {
      if (!newSession?.user) {
        setUser(null);
        setProfile(null);
        setSession(null);
        return;
      }

      // Set session and user immediately to prevent UI flicker
      setSession(newSession);
      setUser(newSession.user);

      // Fetch profile
      const profile = await fetchProfile(newSession.user.id, newSession.user.email!);
      
      if (!profile) {
        console.error('Failed to load user profile');
        // Don't reset auth state here, just log the error
        return;
      }
      
      setProfile(profile);
    } catch (error) {
      console.error('Error in handleSessionUpdate:', error);
      // Don't reset auth state on profile fetch error
    }
  }, [fetchProfile]);

  // Separate initialization logic
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Fetch profile in background
          const profile = await fetchProfile(initialSession.user.id, initialSession.user.email!);
          if (mounted && profile) {
            setProfile(profile);
          }
        } else {
          setUser(null);
          setProfile(null);
          setSession(null);
          navigate('/login');
        }
      } catch (error) {
        console.error('Error in initialization:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // Set up auth listener only after initialization
  useEffect(() => {
    if (!initialized) return;

    let mounted = true;
    let authListener: any = null;

    const setupAuthListener = () => {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (!mounted) return;

        if (!newSession) {
          setUser(null);
          setProfile(null);
          setSession(null);
          navigate('/login');
          return;
        }

        // Update session and user immediately
        setSession(newSession);
        setUser(newSession.user);

        // Fetch profile in background
        Promise.resolve().then(async () => {
          try {
            if (!mounted) return;
            const profile = await fetchProfile(newSession.user.id, newSession.user.email!);
            if (mounted && profile) {
              setProfile(profile);
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
          }
        });
      });

      authListener = subscription;
    };

    setupAuthListener();

    return () => {
      mounted = false;
      if (authListener) {
        try {
          authListener.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from auth listener:', error);
        }
      }
    };
  }, [initialized, navigate]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in signIn:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      setProfile(null);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const value = {
    user,
    profile,
    signIn,
    signOut,
    loading,
    session
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}