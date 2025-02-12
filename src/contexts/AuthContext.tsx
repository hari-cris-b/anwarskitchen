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

  const fetchProfile = useCallback(async (userId: string, userEmail: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_profile', { user_id: userId });

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  }, []);

  const handleSessionUpdate = useCallback(async (newSession: Session | null) => {
    try {
      if (!newSession?.user) {
        setUser(null);
        setProfile(null);
        setSession(null);
        return;
      }

      setSession(newSession);
      setUser(newSession.user);

      const profile = await fetchProfile(newSession.user.id, newSession.user.email!);
      
      if (!profile) {
        console.error('Failed to load user profile');
        return;
      }
      
      setProfile(profile);
    } catch (error) {
      console.error('Error in handleSessionUpdate:', error);
    }
  }, [fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          
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
  }, [fetchProfile, navigate]);

  useEffect(() => {
    if (!initialized) return;

    let mounted = true;
    let authListener: any = null;

    const setupAuthListener = () => {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (!mounted) return;

        if (!newSession) {
          setUser(null);
          setProfile(null);
          setSession(null);
          navigate('/login');
          return;
        }

        setSession(newSession);
        setUser(newSession.user);

        try {
          const profile = await fetchProfile(newSession.user.id, newSession.user.email!);
          if (mounted && profile) {
            setProfile(profile);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      });

      authListener = subscription;
    };

    setupAuthListener();

    return () => {
      mounted = false;
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, [initialized, navigate, fetchProfile]);

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