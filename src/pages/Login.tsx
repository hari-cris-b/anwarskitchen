import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Store, ChefHat } from 'lucide-react';
import { supabase, supabaseAdmin } from '../lib/supabase';

interface ValidationErrors {
  email?: string;
  password?: string;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user && profile?.franchise_id) {
      const from = (location.state as any)?.from?.pathname || '/pos';
      navigate(from, { replace: true });
    }
  }, [user, profile, authLoading, navigate, location]);

  // Clear error when inputs change
  useEffect(() => {
    if (error) setError('');
  }, [email, password]);

  const validateEmail = (email: string): string | undefined => {
    if (!email) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Please enter a valid email address';
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return undefined;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (field === 'email') {
      setValidationErrors(prev => ({
        ...prev,
        email: validateEmail(email)
      }));
    } else if (field === 'password') {
      setValidationErrors(prev => ({
        ...prev,
        password: validatePassword(password)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    setValidationErrors({
      email: emailError,
      password: passwordError,
    });

    if (emailError || passwordError) {
      setTouched({ email: true, password: true });
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const response = await signIn(email, password);
      
      // Check for weak password warning
      if (response.weakPassword) {
        console.warn('Weak password detected:', response.weakPassword.message);
      }
      
      // Navigation will be handled by the useEffect
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError('');
    
    // Validate all fields
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    setValidationErrors({
      email: emailError,
      password: passwordError,
    });

    if (emailError || passwordError) {
      setTouched({ email: true, password: true });
      return;
    }

    try {
      setIsLoading(true);

      // Step 1: Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes('email already registered')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError('Error creating account. Please try again later.');
        }
        return;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Step 2: Create profile
      await createProfile(authData.user.id, email);

      // Step 3: Try an immediate sign in
      try {
        await signIn(email, password);
      } catch (signInError) {
        // If immediate sign-in fails, show success message
        setError('Account created successfully! You can now sign in.');
        setEmail('');
        setPassword('');
      }

    } catch (err: any) {
      console.error('Sign up error:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const createProfile = async (userId: string, userEmail: string) => {
    try {
      // First, check if any admin exists
      const { data: adminExists } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .maybeSingle();

      // Get or create default franchise
      let franchiseId;
      const { data: existingFranchise } = await supabaseAdmin
        .from('franchises')
        .select('id')
        .limit(1)
        .single();

      if (!existingFranchise) {
        const { data: newFranchise, error: franchiseError } = await supabaseAdmin
          .from('franchises')
          .insert([{ name: 'Default Franchise', address: '123 Main St' }])
          .select()
          .single();

        if (franchiseError) throw franchiseError;
        franchiseId = newFranchise.id;
      } else {
        franchiseId = existingFranchise.id;
      }

      // Create profile using admin client
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert([
          {
            id: userId,
            email: userEmail,
            full_name: userEmail.split('@')[0],
            role: adminExists ? 'staff' : 'admin',
            franchise_id: franchiseId
          }
        ]);

      if (profileError) throw profileError;
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  };

  // Show loading spinner while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center space-x-4">
          <Store className="h-12 w-12 text-orange-600" />
          <ChefHat className="h-12 w-12 text-orange-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Restaurant POS
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className={`p-4 rounded-md ${
                error.includes('successfully') 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) {
                      setValidationErrors(prev => ({
                        ...prev,
                        email: validateEmail(e.target.value)
                      }));
                    }
                  }}
                  onBlur={() => handleBlur('email')}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    touched.email && validationErrors.email
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-orange-500 focus:border-orange-500'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                />
                {touched.email && validationErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) {
                      setValidationErrors(prev => ({
                        ...prev,
                        password: validatePassword(e.target.value)
                      }));
                    }
                  }}
                  onBlur={() => handleBlur('password')}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    touched.password && validationErrors.password
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-orange-500 focus:border-orange-500'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                />
                {touched.password && validationErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col space-y-4">
              <button
                type="submit"
                disabled={isLoading || (touched.email && !!validationErrors.email) || (touched.password && !!validationErrors.password)}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Sign in'}
              </button>
              
              <button
                type="button"
                onClick={handleSignUp}
                disabled={isLoading || (touched.email && !!validationErrors.email) || (touched.password && !!validationErrors.password)}
                className="w-full flex justify-center py-2 px-4 border border-orange-600 rounded-md shadow-sm text-sm font-medium text-orange-600 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}