import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const CreateAccount = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const validateEmail = async (email: string) => {
    try {
      try {
        // Check if email exists and is verified using RPC
        const { data, error } = await supabase.rpc('check_staff_email', {
          p_email: email
        });

        if (error) {
          console.error('Error checking staff email:', error);
          if (error.code === '42501') { // Permission denied
            throw new Error('System configuration error. Please contact support.');
          }
          throw new Error('Unable to verify email status. Please try again later.');
        }

        // Add debug logging
        console.log('Staff email check response:', data);

        // Get first result from array
        const result = Array.isArray(data) ? data[0] : data;

        // Check various cases
        if (!result || result.email_exists === false) {
          throw new Error('Please contact your administrator to register your email');
        }

        if (result.has_auth_id === true) {
          const error = new Error('An account already exists for this email. Please sign in instead.');
          error.name = 'AccountExists';
          throw error;
        }

        // Staff exists and is verified
        if (result.is_verified === true) {
          // Use staff_email_status view to get staff record
          const { data: staffRecord, error: staffError } = await supabase
            .from('staff_email_status')
            .select('id,email_verified')
            .eq('email', email)
            .maybeSingle();

          if (staffError || !staffRecord) {
            throw new Error('Unable to verify staff record');
          }

          return staffRecord.id;
        }

        throw new Error('Your email is pending verification by administrator');
      } catch (err) {
        console.error('Error in email validation:', err);
        throw err;
      }
    } catch (err) {
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate password
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Validate email against staff table
      // Validate email and get staff ID
      const staffId = await validateEmail(email);

      // Get staff details
      const { data: staffRecord, error: staffError } = await supabase
        .from('staff_email_status')
        .select('id, staff_type, franchise_id, full_name')
        .eq('id', staffId)
        .single();

      if (staffError || !staffRecord) {
        throw new Error('Unable to verify staff details');
      }

      // Create account in auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            staff_id: staffId,
            sub: staffId, // Required for auth
            name: staffRecord.full_name,
            role: staffRecord.staff_type,
            franchise_id: staffRecord.franchise_id,
            email_verified: true,
            phone_verified: false
          }
        }
      });

      if (signUpError) throw signUpError;

      // Update staff record with auth_id
      if (authData.user) {
        const { error: updateError } = await supabase
          .from('staff')
          .update({ auth_id: authData.user.id })
          .eq('id', staffId);

        if (updateError) throw updateError;
      }

      toast.success('Account created successfully! Please login with your credentials.', {
        duration: 5000,
        icon: '✅'
      });
      navigate('/login', { replace: true });

    } catch (err) {
      console.error('Error creating account:', err);
      
      if (err instanceof Error) {
        if (err.name === 'AccountExists') {
          toast.error('Account already exists. Redirecting to login...', {
            duration: 3000,
            icon: '⚠️'
          });
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create Your Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please use your pre-registered email address
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email address"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Create a password"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm your password"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <LoadingSpinner size="small" color="text-white" label="" />
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          <div className="text-center">
            <a href="/login" className="text-sm text-blue-600 hover:text-blue-500">
              Already have an account? Sign in
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAccount;