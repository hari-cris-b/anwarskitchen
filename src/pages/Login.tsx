import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authLogger } from '../utils/authLogger';
import LoadingSpinner from '../components/LoadingSpinner';

type LoginMode = 'staff' | 'super_admin';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<LoginMode>('staff');
  const { signIn, error, loading, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLoading, setShowLoading] = useState(false);
  
  useEffect(() => {
    if (profile) {
      authLogger.info('Login', 'Profile detected', { 
        type: profile.staff_type,
        mode: loginMode 
      });

      const redirectPath = profile.staff_type === 'super_admin' 
        ? '/super-admin/franchises'
        : location.state?.from?.pathname || '/';

      authLogger.logRedirect(
        location.pathname,
        redirectPath,
        `Login success - ${profile.staff_type}`
      );

      navigate(redirectPath, { replace: true });
    }
  }, [profile, navigate, location, loginMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setShowLoading(true);

    authLogger.info('Login', 'Attempting login', { 
      email,
      mode: loginMode 
    });

    try {
      await signIn(email, password, loginMode);
      authLogger.logLogin(loginMode, email, true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in';
      authLogger.logLogin(loginMode, email, false, errorMessage);
      authLogger.error('Login', 'Login error', { error: err });
      setFormError(errorMessage);
    } finally {
      setShowLoading(false);
    }
  };

  const handleModeChange = (mode: LoginMode) => {
    authLogger.debug('Login', 'Mode changed', { 
      from: loginMode, 
      to: mode 
    });
    setLoginMode(mode);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center transform transition-transform duration-300 hover:scale-105">
              <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-sm text-gray-600">
            Sign in to access your {loginMode === 'super_admin' ? 'admin panel' : 'POS system'}
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-sm rounded-lg">
          {/* Login Mode Tabs */}
          <div className="flex rounded-md shadow-sm mb-6" role="group">
            <button
              type="button"
              onClick={() => handleModeChange('staff')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-lg ${
                loginMode === 'staff'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:text-indigo-600'
              } border border-gray-200 transition-colors duration-200`}
            >
              Staff Login
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('super_admin')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-lg ${
                loginMode === 'super_admin'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:text-indigo-600'
              } border border-gray-200 transition-colors duration-200`}
            >
              Super Admin
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder={`Enter your ${loginMode === 'super_admin' ? 'admin' : 'staff'} email`}
                  disabled={showLoading}
                />
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
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your password"
                  disabled={showLoading}
                />
              </div>
            </div>

            {(formError || error) && (
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
                    <h3 className="text-sm font-medium text-red-800">
                      {formError || error}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={showLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {showLoading ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="small" color="text-white" label="" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>

            {loginMode === 'staff' && (
              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <a
                    href="/create-account"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Create one now
                  </a>
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;